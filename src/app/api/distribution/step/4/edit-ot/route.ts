import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  const { monthId, code, fromDay, toDay } = await req.json();
  if (!monthId || !code || !fromDay || !toDay || fromDay === toDay) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const conn = await getConn();
  try {
    const [emp] = await conn.all<{ id: string }>(
      `SELECT id FROM employees WHERE month_id = ? AND code = ? AND active = TRUE`,
      monthId, code
    );
    if (!emp) { await conn.close(); return NextResponse.json({ error: 'Employee not found' }, { status: 404 }); }

    const [fromRow] = await conn.all<{ ot_hours: number; day_type: number }>(
      `SELECT ot_hours, day_type FROM distribution_results WHERE month_id = ? AND employee_id = ? AND day = ?`,
      monthId, emp.id, fromDay
    );
    const [toRow] = await conn.all<{ ot_hours: number; day_type: number }>(
      `SELECT ot_hours, day_type FROM distribution_results WHERE month_id = ? AND employee_id = ? AND day = ?`,
      monthId, emp.id, toDay
    );

    if (!fromRow || !toRow) { await conn.close(); return NextResponse.json({ error: 'Day not found' }, { status: 404 }); }

    const srcOt = Math.round((Number(fromRow.ot_hours) || 0) * 100) / 100;
    if (srcOt <= 0) { await conn.close(); return NextResponse.json({ error: 'Source day has no OT' }, { status: 400 }); }

    await conn.run(
      `UPDATE distribution_results SET ot_hours = 0 WHERE month_id = ? AND employee_id = ? AND day = ?`,
      monthId, emp.id, fromDay
    );

    await conn.run(
      `UPDATE distribution_results SET ot_hours = ROUND(COALESCE(ot_hours, 0) + ?, 2) WHERE month_id = ? AND employee_id = ? AND day = ?`,
      srcOt, monthId, emp.id, toDay
    );

    await conn.close();
    return NextResponse.json({ ok: true, fromDay, toDay, movedOtH: srcOt });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
