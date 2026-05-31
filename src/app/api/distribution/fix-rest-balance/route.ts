import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-rest-balance
 * Body: { monthId }
 *
 * Cân bằng số người nghỉ GIỮA CÁC NGÀY trong tháng bằng swap X ↔ LP.
 *
 * Logic mới: số người nghỉ mỗi ngày không chênh quá ±1 so với TB phòng.
 * - Ngày có quá nhiều người nghỉ (> TB+1) → đổi LP→X
 * - Ngày có quá ít người nghỉ (< TB-1) → đổi X→LP
 * - Swap giữa 2 ngày của cùng 1 NV: ngày nhiều nghỉ (LP) ↔ ngày ít nghỉ (X)
 *
 * dayType mapping:
 * 0=X (làm), 1=LP (nghỉ), 2=PN (phép năm) ← có thể thay đổi
 * ≥3: Ô, TS, DS, O, NL, OF, P... ← Dữ liệu cố định, KHÔNG thay đổi
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

    // Load employees + dept + ngayNghiCuoiThangTruoc
    const empRows = await conn.all<{ empId: string; empCode: string; deptId: string; deptCode: string; ngayNghiCuoiThangTruoc: string }>(
      `SELECT e.id AS empId, e.code AS empCode, e.department_id AS deptId, d.code AS deptCode,
              COALESCE(e.ngay_nghi_cuoi_thang_truoc, '') AS ngayNghiCuoiThangTruoc
       FROM employees e JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ?`, monthId
    );

    // Load distribution_results
    const drRows = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT employee_id AS empId, day, day_type AS dayType
       FROM distribution_results WHERE month_id = ? ORDER BY employee_id, day`, monthId
    );

    // Build map: empId → days (1-indexed: day → dayType)
    const empDays = new Map<string, Map<number, number>>();
    // Map: empId → initRun (work days cuối tháng trước)
    const empInitRun = new Map<string, number>();
    const calcConsecutiveDays = (ngayNghi: string): number => {
      if (!ngayNghi) return 0;
      const s = ngayNghi.trim().replace(/^["']|["']$/g, '');
      if (!s) return 0;
      let d: number, m: number, y: number;
      if (s.includes('/')) {
        const parts = s.split('/').map(Number);
        if (parts.length < 2) return 0;
        [d, m, y] = parts;
      } else {
        const parts = s.split('T')[0].split(' ')[0].split('-').map(Number);
        if (parts.length < 3) return 0;
        [y, m, d] = parts;
      }
      const lastDay = new Date(y, m, 0).getDate();
      return Math.max(0, lastDay - d);
    };
    for (const e of empRows) {
      empDays.set(e.empId, new Map());
      empInitRun.set(e.empId, calcConsecutiveDays(e.ngayNghiCuoiThangTruoc));
    }
    for (const r of drRows) {
      empDays.get(r.empId)?.set(r.day, r.dayType);
    }

    // Group by dept
    const deptGroups = new Map<string, { empId: string; code: string }[]>();
    for (const e of empRows) {
      if (skipCodes.has(e.deptCode.toUpperCase())) continue;
      if (!deptGroups.has(e.deptId)) deptGroups.set(e.deptId, []);
      deptGroups.get(e.deptId)!.push({ empId: e.empId, code: e.empCode });
    }

    // Helper: Kiểm tra nếu swap LP→X tại ngày này có vi phạm consecutive không
    // (kiểm tra cả trong tháng và liên tháng)
    const canSwapToWork = (empId: string, day: number): boolean => {
      const dayMap = empDays.get(empId);
      if (!dayMap) return false;
      let runBefore = 0;
      const runStartDay = (() => {
        for (let d = day - 1; d >= 1; d--) {
          if (dayMap.get(d) === 0) runBefore++;
          else return d + 1;
        }
        return 1;
      })();
      let runAfter = 0;
      for (let d = day + 1; d <= daysInMonth; d++) {
        if (dayMap.get(d) === 0) runAfter++;
        else break;
      }
      const totalInMonth = runBefore + 1 + runAfter;
      // Nếu run bắt đầu từ ngày 1, cộng thêm initRun từ tháng trước
      const initRun = runStartDay === 1 ? (empInitRun.get(empId) ?? 0) : 0;
      return (initRun + totalInMonth) <= maxConsec;
    };

    const changes: { empId: string; day: number; dayType: number }[] = [];
    let totalViolatingDays = 0;
    let totalFixedDays = 0;

    for (const [, members] of deptGroups) {
      if (members.length < 3) continue;
      const totalMembers = members.length;

      // Xây dailyRest
      const dailyRest: number[] = new Array(daysInMonth + 1).fill(0);
      for (const m of members) {
        const dayMap = empDays.get(m.empId);
        if (!dayMap) continue;
        for (let d = 1; d <= daysInMonth; d++) {
          const dt = dayMap.get(d);
          if (dt !== undefined && dt !== 0) dailyRest[d]++;
        }
      }

      // Ngày đặc biệt (tất cả NV nghỉ)
      const specialDays = new Set<number>();
      for (let d = 1; d <= daysInMonth; d++) {
        if (dailyRest[d] >= totalMembers) specialDays.add(d);
      }
      const checkedDays = daysInMonth - specialDays.size;
      if (checkedDays === 0) continue;

      let totalRest = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (!specialDays.has(d)) totalRest += dailyRest[d];
      }
      const avg = totalRest / checkedDays;

      for (let round = 0; round < 50; round++) {
        const overDays: number[] = [];
        const underDays: number[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          if (specialDays.has(d)) continue;
          if (dailyRest[d] > Math.floor(avg) + 1) overDays.push(d);
          if (dailyRest[d] < Math.ceil(avg) - 1) underDays.push(d);
        }
        if (overDays.length === 0 || underDays.length === 0) break;

        let swapped = false;
        for (const overDay of overDays) {
          for (const underDay of underDays) {
            for (const m of members) {
              const dayMap = empDays.get(m.empId);
              if (!dayMap) continue;
              const overType = dayMap.get(overDay);
              const underType = dayMap.get(underDay);
              if (overType === 1 && underType === 0) {
                if (!canSwapToWork(m.empId, overDay)) continue;
                dayMap.set(overDay, 0);
                dayMap.set(underDay, 1);
                dailyRest[overDay]--;
                dailyRest[underDay]++;
                changes.push({ empId: m.empId, day: overDay, dayType: 0 });
                changes.push({ empId: m.empId, day: underDay, dayType: 1 });
                swapped = true;
                totalFixedDays++;
                break;
              }
            }
            if (swapped) break;
          }
          if (swapped) break;
        }
        if (!swapped) break;
      }
    }

    // Đếm số ngày còn vi phạm
    for (const [, members] of deptGroups) {
      if (members.length < 3) continue;
      const totalMembers = members.length;
      const dailyRest: number[] = new Array(daysInMonth + 1).fill(0);
      for (const m of members) {
        const dayMap = empDays.get(m.empId);
        if (!dayMap) continue;
        for (let d = 1; d <= daysInMonth; d++) {
          const dt = dayMap.get(d);
          if (dt !== undefined && dt !== 0) dailyRest[d]++;
        }
      }
      const specialDays = new Set<number>();
      for (let d = 1; d <= daysInMonth; d++) {
        if (dailyRest[d] >= totalMembers) specialDays.add(d);
      }
      const checkedDays = daysInMonth - specialDays.size;
      if (checkedDays === 0) continue;
      let totalRest = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (!specialDays.has(d)) totalRest += dailyRest[d];
      }
      const avg = totalRest / checkedDays;
      for (let d = 1; d <= daysInMonth; d++) {
        if (specialDays.has(d)) continue;
        const dev = dailyRest[d] - avg;
        if (dev > 1 || dev < -1) totalViolatingDays++;
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({
        ok: true, fixed: 0, total: totalViolatingDays,
        message: totalViolatingDays === 0
          ? 'Không có vi phạm cân bằng ngày nghỉ'
          : 'Có vi phạm nhưng không thể swap (sẽ vi phạm consecutive)',
      });
    }

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
      ok: true, fixed: totalFixedDays, total: totalViolatingDays,
      changes: changes.length,
      message: `Đã sửa ${totalFixedDays} ngày vi phạm bằng cách swap X ↔ LP giữa các ngày`,
    });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
