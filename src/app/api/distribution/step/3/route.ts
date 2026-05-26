import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadShiftMap, loadSpecialDeptIds, markStepDone, getShiftEntry } from '@/lib/stepHelpers';
import { step4_assignShiftsBatch } from '@/lib/distributionEngine';
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
import { parsePage, buildPagedResponse } from '@/lib/paginate';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  const conn = await getConn();
  try {
    const shiftMap = await loadShiftMap(monthId);

    const emps = await conn.all<{ id: string; departmentId: string }>(
      `SELECT id, department_id AS departmentId FROM employees WHERE month_id = ? AND active = TRUE`, monthId
    );
    const allDays = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT employee_id AS empId, day, day_type AS dayType
       FROM distribution_results WHERE month_id = ? ORDER BY employee_id, day`, monthId
    );

    // Group days by empId
    const daysByEmp = new Map<string, { day: number; dayType: number }[]>();
    for (const d of allDays) {
      if (!daysByEmp.has(d.empId)) daysByEmp.set(d.empId, []);
      daysByEmp.get(d.empId)!.push({ day: d.day, dayType: d.dayType });
    }

    // Tính toán tất cả changes in-memory
    // QT5: chia ca cân bằng theo phòng ban — mỗi ngày đếm C1/C2 trong phòng, ưu tiên ca ít hơn
    // deptDayCount[deptId][day] = { c1: số NV Ca1, c2: số NV Ca2 }
    const deptDayCount = new Map<string, Map<number, { c1: number; c2: number }>>();

    const rows: string[] = [];
    for (const emp of emps) {
      const deptId = emp.departmentId ?? null;
      const entry = getShiftEntry(shiftMap, deptId);
      const isCommonShift = !deptId || !shiftMap.has(deptId);
      const days = daysByEmp.get(emp.id) ?? [];

      if (!entry.ca1 || !entry.ca2) {
        // Chỉ 1 ca → gán thẳng
        const assigned = step4_assignShiftsBatch(days, entry.ca1, entry.ca2, isCommonShift);
        for (const a of assigned) {
          const sc = (a.shiftCode ?? '').replace(/'/g, "''");
          rows.push(`('${emp.id}',${a.day},'${sc}')`);
        }
        continue;
      }

      // Có 2 ca → chia cân bằng theo phòng
      const key = deptId ?? 'DEFAULT';
      if (!deptDayCount.has(key)) deptDayCount.set(key, new Map());
      const dayCount = deptDayCount.get(key)!;

      for (const d of days) {
        if (d.dayType !== 0) { rows.push(`('${emp.id}',${d.day},'')`); continue; }
        if (!dayCount.has(d.day)) dayCount.set(d.day, { c1: 0, c2: 0 });
        const cnt = dayCount.get(d.day)!;
        // Chọn ca ít hơn; nếu bằng nhau thì random
        let sc: string;
        if (cnt.c1 < cnt.c2) { sc = 'C1'; cnt.c1++; }
        else if (cnt.c2 < cnt.c1) { sc = 'C2'; cnt.c2++; }
        else { sc = randInt(1, 2) === 1 ? 'C1' : 'C2'; sc === 'C1' ? cnt.c1++ : cnt.c2++; }
        rows.push(`('${emp.id}',${d.day},'${sc}')`);
      }
    }

    if (rows.length > 0) {
      // Bulk INSERT vào temp table rồi UPDATE JOIN 1 lần
      const chunkSize = 500;
      await conn.run(`CREATE TEMP TABLE IF NOT EXISTS _tmp_shift (emp_id VARCHAR, day INTEGER, shift_code VARCHAR)`);
      await conn.run(`DELETE FROM _tmp_shift`);
      for (let i = 0; i < rows.length; i += chunkSize) {
        await conn.run(`INSERT INTO _tmp_shift VALUES ${rows.slice(i, i + chunkSize).join(',')}`);
      }
      await conn.run(
        `UPDATE distribution_results dr
         SET shift_code = t.shift_code
         FROM _tmp_shift t
         WHERE dr.month_id = '${monthId}' AND dr.employee_id = t.emp_id AND dr.day = t.day`
      );
    }

    await markStepDone(monthId, 3);
    await conn.close();
    return NextResponse.json({ ok: true, step: 3, processed: emps.length });
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
      `SELECT e.code, e.name AS empName, d.name AS deptName, e.workdays, dr.day, dr.day_type, dr.shift_code
       FROM distribution_results dr JOIN employees e ON dr.employee_id=e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id=? AND dr.employee_id IN (${placeholders})
       ORDER BY e.code, dr.day`, monthId, ...ids
    );
    await conn.close();
    const map = new Map<string, any>();
    for (const r of rows as any[]) {
      if (!map.has(r.code)) map.set(r.code, { code: r.code, name: r.empName, deptName: r.deptName ?? '', workdays: r.workdays ?? '', days: [] });
      map.get(r.code).days.push({ day: r.day, dayType: r.day_type, shiftCode: r.shift_code });
    }
    return NextResponse.json(buildPagedResponse(Array.from(map.values()), Number(total), page, limit));
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
