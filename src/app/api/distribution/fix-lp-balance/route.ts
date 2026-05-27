import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-lp-balance
 * Body: { monthId }
 * 
 * Cân bằng số người nghỉ/làm THEO TỪNG NGÀY bằng cách SWAP X ↔ LP giữa các NGÀY của cùng NV.
 * 
 * Logic:
 * - Ngày có quá nhiều người nghỉ: Tìm NV đang nghỉ LP (dayType=1) → swap với ngày khác đang làm (X)
 * - Ngày có quá nhiều người làm: Tìm NV đang làm (X) → swap với ngày khác đang nghỉ LP (dayType=1)
 * - Kiểm tra consecutive trước khi swap để đảm bảo không vi phạm 6 ngày liên tiếp
 * - KHÔNG thay đổi workdays (tổng số ngày làm của mỗi NV giữ nguyên)
 * 
 * RÀNG BUỘC QUAN TRỌNG:
 * - CHỈ được thay đổi: X (0), LP (1), PN (2) - dữ liệu tự sinh
 * - TUYỆT ĐỐI KHÔNG thay đổi: dayType ≥ 3 - dữ liệu đầu vào cố định (Ô, TS, DS, O, NL, OF, P, ...)
 * - CHỈ swap X (0) ↔ LP (1), KHÔNG swap với PN (2)
 * 
 * dayType mapping:
 * 0=X (làm), 1=LP (nghỉ lễ/chủ nhật), 2=PN (phép năm) ← Dữ liệu tự sinh, có thể thay đổi
 * ≥3: Ô, TS, DS, O, NL, OF, P, ... ← Dữ liệu đầu vào cố định, TUYỆT ĐỐI KHÔNG thay đổi
 */
export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);
    const maxConsec = params.maxConsecutiveDays;

    const skipCodes = new Set(params.skipEqualRestDeptCodes.map(c => c.toUpperCase()));

    // Load employees + dept
    const empRows = await conn.all<{ empId: string; empCode: string; deptId: string; deptCode: string; deptName: string }>(
      `SELECT e.id AS empId, e.code AS empCode, e.department_id AS deptId, 
              d.code AS deptCode, d.name AS deptName
       FROM employees e JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ?`, monthId
    );

    // Load distribution_results
    const drRows = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT employee_id AS empId, day, day_type AS dayType
       FROM distribution_results WHERE month_id = ? ORDER BY employee_id, day`, monthId
    );

    // Build map: empId → days array (1-indexed: day → dayType)
    const empDays = new Map<string, Map<number, number>>();
    for (const e of empRows) {
      empDays.set(e.empId, new Map());
    }
    for (const r of drRows) {
      empDays.get(r.empId)?.set(r.day, r.dayType);
    }

    // Group by dept
    const deptGroups = new Map<string, { empId: string; code: string; deptName: string }[]>();
    for (const e of empRows) {
      if (skipCodes.has(e.deptCode.toUpperCase())) continue;
      if (!deptGroups.has(e.deptId)) deptGroups.set(e.deptId, []);
      deptGroups.get(e.deptId)!.push({ empId: e.empId, code: e.empCode, deptName: e.deptName });
    }

    // Helper: Kiểm tra nếu swap LP→X tại ngày này có vi phạm consecutive không
    const canSwapToWork = (empId: string, day: number): boolean => {
      const dayMap = empDays.get(empId);
      if (!dayMap) return false;
      
      // Đếm run X trước ngày này
      let runBefore = 0;
      for (let d = day - 1; d >= 1; d--) {
        if (dayMap.get(d) === 0) runBefore++;
        else break;
      }
      
      // Đếm run X sau ngày này
      let runAfter = 0;
      for (let d = day + 1; d <= daysInMonth; d++) {
        if (dayMap.get(d) === 0) runAfter++;
        else break;
      }
      
      // Nếu đổi LP→X, run = runBefore + 1 + runAfter
      return (runBefore + 1 + runAfter) <= maxConsec;
    };

    // Helper: Kiểm tra nếu swap X→LP tại ngày này có vi phạm consecutive không
    // (Đổi X→LP luôn an toàn vì chỉ giảm run, không tăng)
    const canSwapToRest = (empId: string, day: number): boolean => {
      return true; // Luôn an toàn
    };

    const changes: { empId: string; day: number; dayType: number }[] = [];
    let totalViolating = 0;
    let totalFixed = 0;

    // Tìm và sửa vi phạm
    for (const [, members] of deptGroups) {
      if (members.length < 2) continue;
      const deptName = members[0].deptName;

      for (let day = 1; day <= daysInMonth; day++) {
        let workingEmps: string[] = [];
        let restingEmps: string[] = [];

        for (const member of members) {
          const dayType = empDays.get(member.empId)?.get(day);
          if (dayType === undefined) continue;

          if (dayType === 0) {
            workingEmps.push(member.empId);
          } else {
            // Đếm TẤT CẢ người nghỉ: LP(1), PN(2), Ô/TS/DS/O/NL/OF/P(3-9)
            // CHÚ Ý: Khi swap, CHỈ swap với LP(1), KHÔNG động đến PN(2) và các loại đặc biệt(3-9)
            restingEmps.push(member.empId);
          }
        }

        const total = workingEmps.length + restingEmps.length;
        if (total === 0) continue;

        const diff = Math.abs(workingEmps.length - restingEmps.length);
        const maxAllowedDiff = Math.max(
          Math.floor(total * 0.4),
          params.maxDayOffDifference
        );

        if (diff <= maxAllowedDiff) continue; // Không vi phạm
        totalViolating++;

        // Tính số cặp cần swap
        const swapCount = Math.floor(diff / 2);

        if (workingEmps.length < restingEmps.length) {
          // Quá nhiều người nghỉ → Cần chuyển LP→X
          // Tìm NV đang nghỉ ngày này, có thể swap với ngày khác
          let swapped = 0;
          for (const empId of restingEmps) {
            if (swapped >= swapCount) break;

            // CHỈ swap nếu ngày này là LP (dayType=1), KHÔNG swap PN (dayType=2)
            const currentDayType = empDays.get(empId)?.get(day);
            if (currentDayType !== 1) continue; // Không phải LP → bỏ qua

            // Kiểm tra: Đổi LP→X ngày này có vi phạm consecutive không?
            if (!canSwapToWork(empId, day)) continue;

            // Tìm ngày khác mà NV này đang làm (X) để swap
            let foundSwapDay = false;
            for (let otherDay = 1; otherDay <= daysInMonth; otherDay++) {
              if (otherDay === day) continue;

              const otherDayType = empDays.get(empId)?.get(otherDay);
              if (otherDayType !== 0) continue; // Không phải ngày làm

              // Kiểm tra: Đổi X→LP ngày kia có vi phạm consecutive không?
              if (!canSwapToRest(empId, otherDay)) continue;

              // Kiểm tra: Ngày kia có đang thiếu người nghỉ không?
              // (Tránh tạo vi phạm mới ở ngày kia)
              let otherWorkCount = 0, otherRestCount = 0;
              for (const m of members) {
                const dt = empDays.get(m.empId)?.get(otherDay);
                if (dt === 0) otherWorkCount++;
                else if (dt !== undefined) otherRestCount++;
              }
              const otherDiff = Math.abs(otherWorkCount - otherRestCount);
              const otherMaxDiff = Math.max(
                Math.floor((otherWorkCount + otherRestCount) * 0.4),
                params.maxDayOffDifference
              );
              // Nếu swap X→LP ở ngày kia, otherRestCount tăng 1, otherWorkCount giảm 1
              const newOtherDiff = Math.abs((otherWorkCount - 1) - (otherRestCount + 1));
              if (newOtherDiff > otherMaxDiff) continue; // Tạo vi phạm mới

              // OK, thực hiện swap
              empDays.get(empId)!.set(day, 0);       // LP → X
              empDays.get(empId)!.set(otherDay, 1);  // X → LP
              changes.push({ empId, day, dayType: 0 });
              changes.push({ empId, day: otherDay, dayType: 1 });
              swapped++;
              foundSwapDay = true;
              break;
            }

            if (!foundSwapDay) {
              // Không tìm được ngày để swap → bỏ qua NV này
            }
          }

          if (swapped > 0) totalFixed++;

        } else {
          // Quá nhiều người làm → Cần chuyển X→LP
          // Logic tương tự nhưng ngược lại
          let swapped = 0;
          for (const empId of workingEmps) {
            if (swapped >= swapCount) break;

            // Kiểm tra: Đổi X→LP ngày này có vi phạm consecutive không?
            if (!canSwapToRest(empId, day)) continue;

            // Tìm ngày khác mà NV này đang nghỉ LP (dayType=1) để swap
            // CHÚ Ý: CHỈ swap với LP, KHÔNG swap với PN (dayType=2)
            let foundSwapDay = false;
            for (let otherDay = 1; otherDay <= daysInMonth; otherDay++) {
              if (otherDay === day) continue;

              const otherDayType = empDays.get(empId)?.get(otherDay);
              if (otherDayType !== 1) continue; // CHỈ swap với LP (dayType=1), KHÔNG swap PN (dayType=2)

              // Kiểm tra: Đổi LP→X ngày kia có vi phạm consecutive không?
              if (!canSwapToWork(empId, otherDay)) continue;

              // Kiểm tra: Ngày kia có đang thiếu người làm không?
              let otherWorkCount = 0, otherRestCount = 0;
              for (const m of members) {
                const dt = empDays.get(m.empId)?.get(otherDay);
                if (dt === 0) otherWorkCount++;
                else if (dt !== undefined) otherRestCount++;
              }
              const otherDiff = Math.abs(otherWorkCount - otherRestCount);
              const otherMaxDiff = Math.max(
                Math.floor((otherWorkCount + otherRestCount) * 0.4),
                params.maxDayOffDifference
              );
              // Nếu swap LP→X ở ngày kia, otherWorkCount tăng 1, otherRestCount giảm 1
              const newOtherDiff = Math.abs((otherWorkCount + 1) - (otherRestCount - 1));
              if (newOtherDiff > otherMaxDiff) continue; // Tạo vi phạm mới

              // OK, thực hiện swap
              empDays.get(empId)!.set(day, 1);       // X → LP
              empDays.get(empId)!.set(otherDay, 0);  // LP → X
              changes.push({ empId, day, dayType: 1 });
              changes.push({ empId, day: otherDay, dayType: 0 });
              swapped++;
              foundSwapDay = true;
              break;
            }

            if (!foundSwapDay) {
              // Không tìm được ngày để swap → bỏ qua NV này
            }
          }

          if (swapped > 0) totalFixed++;
        }
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({
        ok: true,
        fixed: 0,
        total: totalViolating,
        message: totalViolating === 0 
          ? 'Không có vi phạm cân bằng ngày nghỉ'
          : 'Có vi phạm nhưng không thể swap (sẽ vi phạm consecutive hoặc tạo vi phạm mới)',
      });
    }

    // Batch update
    await conn.run('BEGIN TRANSACTION');
    try {
      for (const c of changes) {
        await conn.run(
          `UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
          c.dayType, monthId, c.empId, c.day
        );
      }
      await conn.run('COMMIT');
    } catch (e) {
      await conn.run('ROLLBACK');
      throw e;
    }

    await conn.close();
    return NextResponse.json({
      ok: true,
      fixed: totalFixed,
      total: totalViolating,
      changes: changes.length,
      message: `Đã sửa ${totalFixed}/${totalViolating} vi phạm bằng cách swap X ↔ LP giữa các ngày`,
    });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
