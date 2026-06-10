import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadShiftMap, markStepDone, getShiftEntry, loadMonthInfo } from '@/lib/stepHelpers';
import { step6_generateTime } from '@/lib/distributionEngine';
import { parsePage, buildPagedResponse } from '@/lib/paginate';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  let conn;
  try {
    conn = await getConn();
    const params = await loadParams(monthId);
    const shiftMap = await loadShiftMap(monthId);
    const { month, year, daysInMonth } = await loadMonthInfo(monthId);

    const rawGroups = await conn.all<{ code: string; workHours: number }>(
      `SELECT code, work_hours AS workHours FROM special_groups WHERE month_id=?`, monthId
    );
    const specialGroupHours = new Map(rawGroups.map(g => [g.code.toUpperCase(), g.workHours]));

    const emps = await conn.all<{ id: string; departmentId: string; specialGroup: string; groupCodeEndDate: string }>(
      `SELECT id, department_id AS departmentId, special_group AS specialGroup,
              COALESCE(group_code_end_date, '') AS groupCodeEndDate
       FROM employees WHERE month_id=? AND active=TRUE`, monthId
    );
    const allDays = await conn.all<{ empId: string; day: number; dayType: number; shiftCode: string; otHours: number; lateMins: number }>(
      `SELECT employee_id AS empId, day, day_type AS dayType,
              COALESCE(shift_code,'') AS shiftCode,
              COALESCE(ot_hours,0) AS otHours, COALESCE(late_mins,0) AS lateMins
       FROM distribution_results WHERE month_id=? AND day BETWEEN 1 AND ? ORDER BY employee_id, day`, monthId, daysInMonth
    );
    const daysByEmp = new Map<string, typeof allDays>();
    for (const d of allDays) {
      if (!daysByEmp.has(d.empId)) daysByEmp.set(d.empId, []);
      daysByEmp.get(d.empId)!.push(d);
    }

    const rows: string[] = [];
    for (const emp of emps) {
      const groupCode = (emp.specialGroup ?? '').toUpperCase();
      const baseGroupWorkHours = groupCode ? (specialGroupHours.get(groupCode) ?? null) : null;
      const entry = getShiftEntry(shiftMap, emp.departmentId ?? null);
      const days = daysByEmp.get(emp.id) ?? [];

      // Parse groupCodeEndDate → ngày kết thúc (day trong tháng), null = không giới hạn
      let endDay: number | null = null;
      if (emp.groupCodeEndDate) {
        const parts = emp.groupCodeEndDate.split(/[\/\-]/);
        if (parts.length >= 3) {
          // dd/mm/yyyy hoặc yyyy-mm-dd
          const d = parseInt(parts[0]), m = parseInt(parts[1]), y = parseInt(parts[2]);
          const [dy, dm, dd] = parts[0].length === 4 ? [d, m, parseInt(parts[2])] : [y, m, d];
          if (dm === month && dy === year) endDay = dd;
          else if (dy < year || (dy === year && dm < month)) endDay = 0; // đã hết hạn toàn tháng
          // dy > year hoặc dm > month → còn hiệu lực toàn tháng → endDay = null
        }
      }

      for (const d of days) {
        // Kiểm tra nhóm đặc thù còn hiệu lực tại ngày d.day không
        const groupWorkHours = (endDay === null || d.day <= endDay) ? baseGroupWorkHours : null;
        const { checkIn, checkOut } = step6_generateTime(
          d.dayType, d.otHours, d.lateMins, d.shiftCode,
          entry.ca1, entry.ca2, groupWorkHours, params
        );
        const ci = checkIn.replace(/'/g, "''");
        const co = checkOut.replace(/'/g, "''");
        rows.push(`('${emp.id}',${d.day},'${ci}','${co}')`);
      }
    }

    if (rows.length > 0) {
      const chunkSize = 500;
      await conn.run(`CREATE TEMP TABLE IF NOT EXISTS _tmp_time (emp_id VARCHAR, day INTEGER, check_in VARCHAR, check_out VARCHAR)`);
      await conn.run(`DELETE FROM _tmp_time`);
      for (let i = 0; i < rows.length; i += chunkSize) {
        await conn.run(`INSERT INTO _tmp_time VALUES ${rows.slice(i, i + chunkSize).join(',')}`);
      }
      await conn.run(
        `UPDATE distribution_results dr
         SET check_in = t.check_in, check_out = t.check_out
         FROM _tmp_time t
         WHERE dr.month_id = ? AND dr.employee_id = t.emp_id AND dr.day = t.day`, monthId
      );
    }

    await markStepDone(monthId, 5);
    await markStepDone(monthId, 6);

    // Cleanup: xoá check_in/check_out ở ngày ngoài daysInMonth
    await conn.run(
      `UPDATE distribution_results SET check_in = '', check_out = '' WHERE month_id = ? AND (day < 1 OR day > ?)`,
      monthId, daysInMonth
    );

    return NextResponse.json({ ok: true, step: 5, processed: emps.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    if (conn) try { await conn.close(); } catch { /* ignore */ }
  }
}
export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const monthId = url.searchParams.get('month') ?? '';
  const { page, limit, offset } = parsePage(url);
  let conn;
  try {
    conn = await getConn();
    const { daysInMonth } = await loadMonthInfo(monthId);
    const [{ total }] = await conn.all<{ total: number }>(
      `SELECT COUNT(DISTINCT employee_id) AS total FROM distribution_results WHERE month_id = ?`, monthId
    );
    const empIds = await conn.all<{ empId: string }>(
      `SELECT DISTINCT dr.employee_id AS empId FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ? ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset
    );
    if (empIds.length === 0) {
      return NextResponse.json(buildPagedResponse([], Number(total), page, limit));
    }
    const ids = empIds.map(r => r.empId);
    const placeholders = ids.map(() => '?').join(',');
    const rows = await conn.all(
      `SELECT e.code, e.name AS empName, d.name AS deptName,
              e.special_group AS specialGroup,
              sg.name AS specialGroupName,
              e.group_code_end_date AS groupCodeEndDate,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              dr.day, dr.day_type AS dayType, dr.shift_code AS shiftCode,
              dr.check_in AS checkIn, dr.check_out AS checkOut,
              dr.ot_hours AS otHours, dr.late_mins AS lateMins
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN special_groups sg ON UPPER(sg.code) = UPPER(e.special_group) AND sg.month_id = e.month_id AND e.special_group <> ''
       WHERE dr.month_id = ? AND dr.employee_id IN (${placeholders}) AND dr.day BETWEEN 1 AND ?
       ORDER BY e.code, dr.day`, monthId, ...ids, daysInMonth
    );
    const map = new Map<string, any>();
    for (const r of rows as any[]) {
      if (!map.has(r.code)) map.set(r.code, {
        code: r.code, name: r.empName, deptName: r.deptName ?? '',
        specialGroup: r.specialGroup ?? '',
        specialGroupName: r.specialGroupName || r.specialGroup || '',
        groupCodeEndDate: r.groupCodeEndDate ?? '',
        ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '',
        days: [],
      });
      map.get(r.code).days.push({
        day: r.day, dayType: r.dayType, shiftCode: r.shiftCode ?? '',
        checkIn: r.checkIn ?? '', checkOut: r.checkOut ?? '',
        otHours: r.otHours ?? 0, lateMins: r.lateMins ?? 0,
      });
    }
    const result = Array.from(map.values()).map(emp => {
      const days = emp.days as any[];
      emp.workCount  = days.filter(d => d.dayType === 0).length;
      emp.lpCount    = days.filter(d => d.dayType === 1).length;
      emp.pnCount    = days.filter(d => d.dayType === 2).length;
      emp.totalOT    = days.reduce((s: number, d: any) => s + (Number(d.otHours) || 0), 0);
      emp.totalLate  = days.reduce((s: number, d: any) => s + (Number(d.lateMins) || 0), 0);
      return emp;
    });
    return NextResponse.json(buildPagedResponse(result, Number(total), page, limit));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    if (conn) try { await conn.close(); } catch { /* ignore */ }
  }
}
