import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { parsePage, buildPagedResponse } from '@/lib/paginate';
export const runtime = 'nodejs';

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
    const rows = await conn.all<{
      empId: string; code: string; empName: string; deptName: string;
      day: number; dayType: number; checkIn: string; checkOut: string;
      shiftCode: string; otHours: number; lateMins: number;
    }>(`
      SELECT e.id AS empId, e.code, e.name AS empName, d.name AS deptName,
             dr.day, dr.day_type AS dayType,
             dr.check_in AS checkIn, dr.check_out AS checkOut,
             dr.shift_code AS shiftCode, dr.ot_hours AS otHours, dr.late_mins AS lateMins
      FROM distribution_results dr
      JOIN employees e ON dr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE dr.month_id = ? AND dr.employee_id IN (${placeholders})
      ORDER BY e.code, dr.day
    `, monthId, ...ids);

    await conn.close();

    const empMap = new Map<string, {
      code: string; name: string; deptName: string;
      days: typeof rows;
      workCount: number; restCount: number; totalOT: number; totalLate: number;
    }>();
    for (const row of rows) {
      if (!empMap.has(row.empId)) {
        empMap.set(row.empId, {
          code: row.code, name: row.empName, deptName: row.deptName ?? '',
          days: [], workCount: 0, restCount: 0, totalOT: 0, totalLate: 0,
        });
      }
      const emp = empMap.get(row.empId)!;
      emp.days.push(row);
      if (row.dayType === 0) emp.workCount++;
      if (row.dayType === 1) emp.restCount++;
      emp.totalOT   += Number(row.otHours)  || 0;
      emp.totalLate += Number(row.lateMins) || 0;
    }
    return NextResponse.json(buildPagedResponse([...empMap.values()], Number(total), page, limit));
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
