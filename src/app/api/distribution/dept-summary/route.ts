import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? '';
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const { daysInMonth } = await loadMonthInfo(monthId);

    const rows = await conn.all<{ deptId: string; deptName: string; day: number; dayType: number }>(
      `SELECT e.department_id AS deptId, COALESCE(d.name, '—') AS deptName,
              dr.day, dr.day_type AS dayType
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id = ?
       ORDER BY deptName, dr.day`, monthId
    );

    // Group: deptId → day → { work, off }
    type DayStat = { work: number; off: number };
    type DeptStat = { deptId: string; deptName: string; days: Record<number, DayStat>; totalWork: number; totalOff: number };
    const deptMap = new Map<string, DeptStat>();

    for (const r of rows) {
      if (!deptMap.has(r.deptId)) {
        deptMap.set(r.deptId, { deptId: r.deptId, deptName: r.deptName, days: {}, totalWork: 0, totalOff: 0 });
      }
      const dept = deptMap.get(r.deptId)!;
      const d = r.day;
      if (!dept.days[d]) dept.days[d] = { work: 0, off: 0 };
      if (Number(r.dayType) === 0) { dept.days[d].work++; dept.totalWork++; }
      else                         { dept.days[d].off++;  dept.totalOff++;  }
    }

    const result = Array.from(deptMap.values())
      .sort((a, b) => a.deptName.localeCompare(b.deptName, 'vi'))
      .map(dept => ({
        deptId: dept.deptId,
        deptName: dept.deptName,
        totalWork: dept.totalWork,
        totalOff: dept.totalOff,
        days: Array.from({ length: daysInMonth }, (_, i) => ({
          day: i + 1,
          work: dept.days[i + 1]?.work ?? 0,
          off:  dept.days[i + 1]?.off  ?? 0,
        })),
      }));

    await conn.close();
    return NextResponse.json({ daysInMonth, depts: result });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
