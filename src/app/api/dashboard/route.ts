import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

const n = (v: unknown) => Number(v ?? 0);

export async function GET(req: NextRequest) {
  let conn;
  try {
    conn = await getConn();
  } catch (e) {
    console.error('[GET /api/dashboard] DB connect error:', e);
    return NextResponse.json({ error: 'DB error', chartData: [], months: [] }, { status: 500 });
  }
  try {
    const monthId = req.nextUrl.searchParams.get('monthId');

    // ── Chi tiết 1 tháng ──────────────────────────────────────────
    if (monthId) {
      const [empStats, deptDist, deptOT, employees, kpiDepts, kpiShifts, kpiLeave, kpiGroups, kpiRules] = await Promise.all([
        conn.all<{ nv_count: number; total_workdays: number; total_ot: number; total_late: number }>(
          `SELECT COUNT(DISTINCT code) AS nv_count,
                  SUM(TRY_CAST(workdays AS DOUBLE)) AS total_workdays,
                  SUM(TRY_CAST(overtime_hours AS DOUBLE)) AS total_ot,
                  SUM(TRY_CAST(late_minutes AS DOUBLE)) AS total_late
           FROM employees WHERE active = TRUE AND month_id = ?`, monthId
        ),
        conn.all<{ dept: string; cnt: number }>(
          `SELECT COALESCE(NULLIF(e.ma_pb,''), d.name, 'Khác') AS dept, COUNT(*) AS cnt
           FROM employees e LEFT JOIN departments d ON e.department_id = d.id
           WHERE e.active = TRUE AND e.month_id = ?
           GROUP BY dept ORDER BY cnt DESC`, monthId
        ),
        conn.all<{ dept: string; total_ot: number }>(
          `SELECT COALESCE(NULLIF(e.ma_pb,''), d.name, 'Khác') AS dept,
                  SUM(TRY_CAST(e.overtime_hours AS DOUBLE)) AS total_ot
           FROM employees e LEFT JOIN departments d ON e.department_id = d.id
           WHERE e.active = TRUE AND e.month_id = ?
           GROUP BY dept ORDER BY total_ot DESC LIMIT 8`, monthId
        ),
        conn.all<{ code: string; name: string; dept: string; workdays: string; overtime_hours: string; late_minutes: string; phep_nam: string }>(
          `SELECT e.code, e.name,
                  COALESCE(NULLIF(e.ma_pb,''), d.name, 'Khác') AS dept,
                  e.workdays, e.overtime_hours, e.late_minutes, e.phep_nam
           FROM employees e LEFT JOIN departments d ON e.department_id = d.id
           WHERE e.active = TRUE AND e.month_id = ?
           ORDER BY e.name ASC`, monthId
        ),
        conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM departments WHERE active = TRUE AND month_id = ?`, monthId),
        conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM shifts WHERE month_id = ?`, monthId),
        conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM leave_types WHERE month_id = ?`, monthId),
        conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM special_groups WHERE month_id = ?`, monthId),
        conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM alloc_rules WHERE active = TRUE AND month_id = ?`, monthId),
      ]);

      const s = empStats[0];
      return NextResponse.json({
        kpi: {
          totalEmployees: n(s?.nv_count),
          totalWorkdays:  Math.round(n(s?.total_workdays)),
          totalOT:        Math.round(n(s?.total_ot)),
          totalLate:      Math.round(n(s?.total_late)),
          totalDepts:     n(kpiDepts[0]?.cnt),
          totalShifts:    n(kpiShifts[0]?.cnt),
          totalLeaveTypes:n(kpiLeave[0]?.cnt),
          totalSpecialGroups: n(kpiGroups[0]?.cnt),
          totalAllocRules:n(kpiRules[0]?.cnt),
        },
        deptDist: deptDist.map(r => ({ ...r, cnt: n(r.cnt) })),
        deptOT:   deptOT.map(r => ({ ...r, total_ot: n(r.total_ot) })),
        employees,
      });
    }

    // ── Tổng quan toàn hệ thống ───────────────────────────────────
    const months = await conn.all<{ id: string; label: string; month: string; locked: boolean }>(
      `SELECT id, label, month, locked FROM months WHERE month != '' ORDER BY strptime(month, '%m/%Y') DESC`
    );
    const monthIds = months.map(m => m.id);

    if (monthIds.length === 0) {
      return NextResponse.json({ months: [], kpi: {}, chartData: [] });
    }

    const ph = monthIds.map(() => '?').join(',');

    const [[kpiDepts], [kpiShifts], [kpiLeave], [kpiGroups], [kpiRules], [kpiEmps]] = await Promise.all([
      conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM departments WHERE active = TRUE`),
      conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM shifts`),
      conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM leave_types`),
      conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM special_groups`),
      conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT id) AS cnt FROM alloc_rules WHERE active = TRUE`),
      conn.all<{ cnt: number }>(`SELECT COUNT(DISTINCT code) AS cnt FROM employees WHERE active = TRUE AND month_id IN (${ph})`, ...monthIds),
    ]);

    const monthStats = await conn.all<{
      month_id: string; month_str: string; nv_count: number;
      total_workdays: number; total_ot: number; total_late: number; locked: boolean;
    }>(
      `SELECT e.month_id, m.month AS month_str,
              COUNT(DISTINCT e.code) AS nv_count,
              SUM(TRY_CAST(e.workdays AS DOUBLE)) AS total_workdays,
              SUM(TRY_CAST(e.overtime_hours AS DOUBLE)) AS total_ot,
              SUM(TRY_CAST(e.late_minutes AS DOUBLE)) AS total_late,
              m.locked
       FROM employees e JOIN months m ON e.month_id = m.id
       WHERE e.active = TRUE AND e.month_id IN (${ph})
       GROUP BY e.month_id, m.month, m.locked
       ORDER BY strptime(m.month, '%m/%Y') ASC`,
      ...monthIds
    );

    return NextResponse.json({
      months: months.map(m => ({ id: m.id, label: m.label || m.month, month: m.month, locked: m.locked })),
      kpi: {
        totalMonths: months.length,
        totalEmployees: n(kpiEmps?.cnt),
        totalDepts: n(kpiDepts?.cnt),
        totalShifts: n(kpiShifts?.cnt),
        totalLeaveTypes: n(kpiLeave?.cnt),
        totalSpecialGroups: n(kpiGroups?.cnt),
        totalAllocRules: n(kpiRules?.cnt),
      },
      chartData: monthStats.map(r => ({
        ...r,
        nv_count: n(r.nv_count),
        total_workdays: n(r.total_workdays),
        total_ot: n(r.total_ot),
        total_late: n(r.total_late),
      })),
    });
  } catch (e) {
    console.error('[dashboard API]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    await conn.close();
  }
}
