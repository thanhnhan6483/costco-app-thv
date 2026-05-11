import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadShiftMap, markStepDone, getShiftEntry } from '@/lib/stepHelpers';
import { step6_generateTime } from '@/lib/distributionEngine';
import { parsePage, buildPagedResponse } from '@/lib/paginate';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const shiftMap = await loadShiftMap(monthId);

    // Load special_groups → map groupCode → work_hours
    const rawGroups = await conn.all<{ code: string; workHours: number }>(
      `SELECT code, work_hours AS workHours FROM special_groups WHERE month_id=?`, monthId
    );
    const specialGroupHours = new Map(rawGroups.map(g => [g.code.toUpperCase(), g.workHours]));

    const emps = await conn.all<{ id: string; departmentId: string; specialGroup: string }>(
      `SELECT id, department_id AS departmentId, special_group AS specialGroup
       FROM employees WHERE month_id=? AND active=TRUE`, monthId
    );
    for (const emp of emps) {
      const groupCode = (emp.specialGroup ?? '').toUpperCase();
      const groupWorkHours = groupCode ? (specialGroupHours.get(groupCode) ?? null) : null;
      const entry = getShiftEntry(shiftMap, emp.departmentId ?? null);
      const days = await conn.all<{ day: number; dayType: number; shiftCode: string; otHours: number; lateMins: number }>(
        `SELECT day, day_type AS dayType, shift_code AS shiftCode, ot_hours AS otHours, late_mins AS lateMins
         FROM distribution_results WHERE month_id=? AND employee_id=? ORDER BY day`,
        monthId, emp.id
      );
      for (const d of days) {
        const { checkIn, checkOut } = step6_generateTime(
          d.dayType, d.otHours, d.lateMins, d.shiftCode,
          entry.ca1, entry.ca2, groupWorkHours, params
        );
        await conn.run(
          `UPDATE distribution_results SET check_in=?, check_out=? WHERE month_id=? AND employee_id=? AND day=?`,
          checkIn, checkOut, monthId, emp.id, d.day
        );
      }
    }
    await markStepDone(monthId, 6);
    await conn.close();
    return NextResponse.json({ ok: true, step: 6, processed: emps.length });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const monthId = url.searchParams.get('month') ?? '';
  const { page, limit, offset } = parsePage(url);
  const conn = await getConn();
  try {
    const [{ total }] = await conn.all<{ total: number }>(
      `SELECT COUNT(DISTINCT employee_id) AS total FROM distribution_results WHERE month_id = ?`, monthId
    );
    const empIds = await conn.all<{ empId: string }>(
      `SELECT DISTINCT dr.employee_id AS empId FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ? ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset
    );
    if (empIds.length === 0) {
      await conn.close();
      return NextResponse.json(buildPagedResponse([], Number(total), page, limit));
    }
    const ids = empIds.map(r => r.empId);
    const placeholders = ids.map(() => '?').join(',');
    const rows = await conn.all(
      `SELECT e.code, e.name AS empName, d.name AS deptName,
              dr.day, dr.day_type AS dayType, dr.shift_code AS shiftCode,
              dr.check_in AS checkIn, dr.check_out AS checkOut
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id = ? AND dr.employee_id IN (${placeholders})
       ORDER BY e.code, dr.day`, monthId, ...ids
    );
    await conn.close();
    const map = new Map<string, any>();
    for (const r of rows as any[]) {
      if (!map.has(r.code)) map.set(r.code, {
        code: r.code, name: r.empName, deptName: r.deptName ?? '', days: [],
      });
      map.get(r.code).days.push({
        day: r.day, dayType: r.dayType, shiftCode: r.shiftCode ?? '',
        checkIn: r.checkIn ?? '', checkOut: r.checkOut ?? '',
      });
    }
    return NextResponse.json(buildPagedResponse(Array.from(map.values()), Number(total), page, limit));
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
