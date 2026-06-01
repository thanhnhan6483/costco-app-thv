import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
import { calcConsecutiveDays } from '@/lib/distributionEngine';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId, empCodes } = await req.json() as { monthId: string; empCodes?: string[] };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
  const filterSet = empCodes ? new Set(empCodes.map(c => c.trim().toUpperCase())) : null;

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);
    const max = params.maxConsecutiveDays;

    const drRows = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT dr.employee_id AS empId, dr.day, dr.day_type AS dayType
       FROM distribution_results dr
       WHERE dr.month_id = ?
       ORDER BY dr.employee_id, dr.day`, monthId
    );

    const empRows = await conn.all<{
      id: string; code: string; name: string; deptName: string;
      workdays: number; ngayNghiCuoiThangTruoc: string;
    }>(
      `SELECT e.id, e.code, e.name, COALESCE(d.name, '') AS deptName,
              COALESCE(TRY_CAST(e.workdays AS INTEGER), 0) AS workdays,
              COALESCE(e.ngay_nghi_cuoi_thang_truoc, '') AS ngayNghiCuoiThangTruoc
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.month_id = ?`, monthId
    );
    const empMap = new Map(empRows.map(e => [e.id, e]));

    const dayMap = new Map<string, number[]>();
    for (const r of drRows) {
      if (!dayMap.has(r.empId)) dayMap.set(r.empId, Array(daysInMonth).fill(-1));
      if (r.day >= 1 && r.day <= daysInMonth) dayMap.get(r.empId)![r.day - 1] = Number(r.dayType);
    }

    const changes: { empId: string; day: number; dayType: number }[] = [];
    let problemCount = 0;

    for (const [empId, arr] of dayMap) {
      const emp = empMap.get(empId);
      if (!emp) continue;
      if (filterSet && !filterSet.has(emp.code.toUpperCase())) continue;

      const initRun = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc ?? '');
      if (initRun <= 0) continue;

      // Chỉ sửa vi phạm liên tháng (do initRun), không sửa toàn bộ consecutive
      // Dùng single pass — không while loop để tránh crash V8 heap
      let run = initRun;
      let hadViolation = false;
      for (let i = 0; i < daysInMonth; i++) {
        if (arr[i] === 0) {
          run++;
          if (run > max) {
            hadViolation = true;
            // Vị trí cần LP: theo gợi ý từ validate (maxConsecutiveDays - initRun)
            const insertPos = Math.max(0, max - initRun - 1);
            if (insertPos >= 0 && insertPos <= i && arr[insertPos] === 0) {
              let swapIdx = -1;
              for (let j = i + 1; j < daysInMonth; j++) {
                if (arr[j] === 1) { swapIdx = j; break; }
              }
              if (swapIdx === -1) {
                for (let j = insertPos - 1; j >= 0; j--) {
                  if (arr[j] === 1) { swapIdx = j; break; }
                }
              }
              if (swapIdx !== -1) {
                arr[insertPos] = 1;
                arr[swapIdx] = 0;
                changes.push({ empId, day: insertPos + 1, dayType: 1 });
                changes.push({ empId, day: swapIdx + 1, dayType: 0 });
              }
            }
            break; // chỉ fix vi phạm đầu tiên (do initRun), các vi phạm sau để nút "Sửa liên tiếp" xử lý
          }
        } else {
          run = 0; break;
        }
      }
      if (hadViolation) problemCount++;
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, fixed: 0, total: problemCount, message: 'Không có nhân viên nào cần sửa (hoặc vị trí đã là LP)' });
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
    return NextResponse.json({ ok: true, fixed: changes.length / 2, total: problemCount });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

