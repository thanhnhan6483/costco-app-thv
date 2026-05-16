import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, markStepDone, DAY_COLS } from '@/lib/stepHelpers';
import { step5_distributeOTLate } from '@/lib/distributionEngine';
import { parsePage, buildPagedResponse } from '@/lib/paginate';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  const conn = await getConn();
  try {
    const params = await loadParams(monthId);

    const emps = await conn.all<{ id: string; overtimeHours: string; lateMinutes: string }>(
      `SELECT id, overtime_hours AS overtimeHours, late_minutes AS lateMinutes
       FROM employees WHERE month_id = ? AND active = TRUE`, monthId
    );
    const allDays = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT employee_id AS empId, day, day_type AS dayType
       FROM distribution_results WHERE month_id = ? ORDER BY employee_id, day`, monthId
    );

    const daysByEmp = new Map<string, { day: number; dayType: number }[]>();
    for (const d of allDays) {
      if (!daysByEmp.has(d.empId)) daysByEmp.set(d.empId, []);
      daysByEmp.get(d.empId)!.push({ day: d.day, dayType: d.dayType });
    }

    const rows: string[] = [];
    for (const emp of emps) {
      const days = daysByEmp.get(emp.id) ?? [];
      if (days.length === 0) continue;
      const arrangement = days.map(d => d.dayType);
      const otH  = parseFloat(emp.overtimeHours) || 0;
      const latM = parseFloat(emp.lateMinutes)   || 0;
      const dist = step5_distributeOTLate(arrangement, otH, latM, params);
      for (let i = 0; i < days.length; i++) {
        rows.push(`('${emp.id}',${days[i].day},${dist[i].otH},${dist[i].lateM})`);
      }
    }

    if (rows.length > 0) {
      const chunkSize = 500;
      await conn.run(`CREATE TEMP TABLE IF NOT EXISTS _tmp_otlate (emp_id VARCHAR, day INTEGER, ot_hours DOUBLE, late_mins DOUBLE)`);
      await conn.run(`DELETE FROM _tmp_otlate`);
      for (let i = 0; i < rows.length; i += chunkSize) {
        await conn.run(`INSERT INTO _tmp_otlate VALUES ${rows.slice(i, i + chunkSize).join(',')}`);
      }
      await conn.run(
        `UPDATE distribution_results dr
         SET ot_hours = t.ot_hours, late_mins = t.late_mins
         FROM _tmp_otlate t
         WHERE dr.month_id = '${monthId}' AND dr.employee_id = t.emp_id AND dr.day = t.day`
      );
    }

    await markStepDone(monthId, 4);
    await conn.close();
    return NextResponse.json({ ok: true, step: 5, processed: emps.length });
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
      `SELECT COUNT(DISTINCT e.id) AS total FROM employees e WHERE e.month_id = ? AND e.active = TRUE`, monthId
    );
    const empIds = await conn.all<{ empId: string }>(
      `SELECT e.id AS empId FROM employees e
       WHERE e.month_id = ? AND e.active = TRUE
       ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset
    );
    if (empIds.length === 0) {
      await conn.close();
      return NextResponse.json(buildPagedResponse([], Number(total), page, limit));
    }
    const ids = empIds.map(r => r.empId);
    const placeholders = ids.map(() => '?').join(',');
    const rows = await conn.all(
      `SELECT e.code, e.name AS empName, d.name AS deptName, e.workdays,
              dr.day, dr.day_type AS dayType, dr.ot_hours AS otH, dr.late_mins AS lateM
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
        code: r.code, name: r.empName, deptName: r.deptName ?? '', workdays: r.workdays ?? '',
        totalOT: 0, totalLate: 0, days: [],
      });
      const emp = map.get(r.code);
      emp.days.push({ day: r.day, dayType: r.dayType, otH: Math.round((Number(r.otH) || 0) * 100) / 100, lateM: Math.round((Number(r.lateM) || 0) * 100) / 100 });
      emp.totalOT   += Number(r.otH)   || 0;
      emp.totalLate += Number(r.lateM) || 0;
    }
    return NextResponse.json(buildPagedResponse(Array.from(map.values()).map(e => ({
      ...e,
      totalOT: Math.round(e.totalOT * 100) / 100,
      totalLate: Math.round(e.totalLate * 100) / 100,
    })), Number(total), page, limit));
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
