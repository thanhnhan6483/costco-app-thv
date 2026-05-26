import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-ot-balance
 * QT8: Cân bằng OT trong phòng ban — chênh lệch OT giữa NV cùng phòng ≤ maxOtBalanceDiffMinutes
 * Thuật toán: với mỗi ngày, nếu NV trong phòng có OT chênh nhau > threshold,
 * redistribute OT đều hơn (giữ nguyên tổng OT của từng NV).
 */
export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);
    const maxDiffH = params.maxOtBalanceDiffMinutes / 60;

    // Load employees + dept
    const empRows = await conn.all<{ empId: string; deptId: string; deptCode: string }>(
      `SELECT e.id AS empId, e.department_id AS deptId, d.code AS deptCode
       FROM employees e JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ? AND e.active = TRUE`, monthId
    );

    // Load distribution_results: empId → day → { otHours, dayType }
    type DayRow = { empId: string; day: number; dayType: number; otHours: number };
    const drRows = await conn.all<DayRow>(
      `SELECT employee_id AS empId, day, day_type AS dayType, ot_hours AS otHours
       FROM distribution_results WHERE month_id = ?`, monthId
    );

    // Group by empId
    const empDays = new Map<string, Map<number, DayRow>>();
    for (const r of drRows) {
      if (!empDays.has(r.empId)) empDays.set(r.empId, new Map());
      empDays.get(r.empId)!.set(Number(r.day), { ...r, day: Number(r.day), dayType: Number(r.dayType), otHours: Number(r.otHours) });
    }

    // Group employees by dept
    const deptEmps = new Map<string, string[]>();
    for (const e of empRows) {
      if (!deptEmps.has(e.deptId)) deptEmps.set(e.deptId, []);
      deptEmps.get(e.deptId)!.push(e.empId);
    }

    let fixedCount = 0;
    const updates: { empId: string; day: number; otHours: number }[] = [];

    for (const [, members] of deptEmps) {
      if (members.length < 2) continue;

      // Với mỗi ngày, cân bằng OT giữa các NV có OT > 0 trong phòng
      for (let d = 1; d <= daysInMonth; d++) {
        // Lấy NV có ngày làm (dayType=0) và có OT
        const otMembers = members
          .map(empId => ({ empId, ot: empDays.get(empId)?.get(d)?.otHours ?? 0, dayType: empDays.get(empId)?.get(d)?.dayType ?? -1 }))
          .filter(m => m.dayType === 0 && m.ot > 0);

        if (otMembers.length < 2) continue;

        const maxOt = Math.max(...otMembers.map(m => m.ot));
        const minOt = Math.min(...otMembers.map(m => m.ot));
        if (maxOt - minOt <= maxDiffH) continue;

        // Redistribute: tổng OT giữ nguyên, chia đều
        const totalOt = otMembers.reduce((s, m) => s + m.ot, 0);
        const avgOt = totalOt / otMembers.length;
        const rounded = Math.round(avgOt * 4) / 4; // làm tròn 0.25h

        for (const m of otMembers) {
          if (Math.abs(m.ot - rounded) > 0.01) {
            updates.push({ empId: m.empId, day: d, otHours: rounded });
            fixedCount++;
          }
        }
      }
    }

    // Apply updates
    for (const u of updates) {
      await conn.run(
        `UPDATE distribution_results SET ot_hours = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
        u.otHours, monthId, u.empId, u.day
      );
    }

    await conn.close();
    return NextResponse.json({ ok: true, fixedCount });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
