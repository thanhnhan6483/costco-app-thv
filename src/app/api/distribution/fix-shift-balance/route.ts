import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const params = await loadParams(monthId);
  const conn = await getConn();
  try {
    const rows = await conn.all<{ empId: string; deptId: string; day: number; shiftCode: string }>(
      `SELECT dr.employee_id AS empId, e.department_id AS deptId, dr.day, dr.shift_code AS shiftCode
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ? AND dr.day_type = 0 AND dr.shift_code IN ('C1','C2')
       ORDER BY e.department_id, dr.day, e.code`, monthId
    );

    // deptId → day → { c1: empIds[], c2: empIds[] }
    type DayShift = { c1: string[]; c2: string[] };
    const deptDay = new Map<string, Map<number, DayShift>>();
    for (const r of rows) {
      if (!deptDay.has(r.deptId)) deptDay.set(r.deptId, new Map());
      const dayMap = deptDay.get(r.deptId)!;
      if (!dayMap.has(r.day)) dayMap.set(r.day, { c1: [], c2: [] });
      const stat = dayMap.get(r.day)!;
      if (r.shiftCode === 'C1') stat.c1.push(r.empId);
      else stat.c2.push(r.empId);
    }

    const changes: { empId: string; day: number; shiftCode: string }[] = [];

    for (const [, dayMap] of deptDay) {
      for (const [day, stat] of dayMap) {
        // Chỉ xử lý khi có cả 2 ca và chênh > 1
        while (Math.abs(stat.c1.length - stat.c2.length) > params.maxShiftDifference) {
          if (stat.c1.length > stat.c2.length) {
            const empId = stat.c1.pop()!;
            stat.c2.push(empId);
            changes.push({ empId, day, shiftCode: 'C2' });
          } else {
            const empId = stat.c2.pop()!;
            stat.c1.push(empId);
            changes.push({ empId, day, shiftCode: 'C1' });
          }
        }
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, fixed: 0 });
    }

    await conn.run('BEGIN TRANSACTION');
    try {
      for (const c of changes) {
        await conn.run(
          `UPDATE distribution_results SET shift_code = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
          c.shiftCode, monthId, c.empId, c.day
        );
      }
      await conn.run('COMMIT');
    } catch (e) { await conn.run('ROLLBACK'); throw e; }

    await conn.close();
    return NextResponse.json({ ok: true, fixed: changes.length });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
