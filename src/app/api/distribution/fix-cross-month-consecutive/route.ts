import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
import { calcConsecutiveDays } from '@/lib/distributionEngine';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

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
              COALESCE(CAST(e.workdays AS INTEGER), 0) AS workdays,
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

    const isWork = (dt: number) => dt === 0;
    const isPN = (dt: number) => dt === 2;
    const calcNCPB = (arr: number[]) => arr.filter(dt => isWork(dt) || isPN(dt)).length;

    const changes: { empId: string; day: number; dayType: number }[] = [];
    const affectedEmpIds = new Set<string>();

    for (const [empId, arr] of dayMap) {
      const emp = empMap.get(empId);
      if (!emp) continue;

      const ncpb = calcNCPB(arr);
      if (ncpb <= emp.workdays) continue;
      affectedEmpIds.add(empId);

      const initRun = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc ?? '');
      if (initRun <= 0) continue;

      const targetDay = max - initRun;
      if (targetDay < 1 || targetDay > daysInMonth) continue;

      const idx = targetDay - 1;
      if (arr[idx] === 0) {
        arr[idx] = 1;
        changes.push({ empId, day: targetDay, dayType: 1 });
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, fixed: 0, total: affectedEmpIds.size, message: 'Không có nhân viên nào cần sửa (hoặc vị trí đã là LP)' });
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
    return NextResponse.json({ ok: true, fixed: changes.length, total: affectedEmpIds.size });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
