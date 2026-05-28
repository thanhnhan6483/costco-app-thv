import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const monthId = searchParams.get('month') ?? DEFAULT_MONTH_ID;
  const limit   = parseInt(searchParams.get('limit') ?? '10');

  const conn = await getConn();
  try {
    // Lấy danh sách employee_id (limit)
    const emps = await conn.all<{ id: string; code: string; name: string }>(
      `SELECT id, code, name FROM employees WHERE month_id = ? AND active = TRUE LIMIT ?`,
      monthId, limit,
    );

    const rows = [];
    for (const emp of emps) {
      const days = await conn.all<{
        day: number; day_type: number; check_in: string; check_out: string; shift_code: string;
      }>(
        `SELECT day, day_type, check_in, check_out, shift_code
         FROM distribution_results WHERE month_id = ? AND employee_id = ?
         ORDER BY day`,
        monthId, emp.id,
      );

      const workCount = days.filter(d => d.day_type === 0).length;
      const restCount = days.filter(d => d.day_type === 1).length;
      const pnCount   = days.filter(d => d.day_type === 2).length;

      rows.push({
        employee_id: emp.id,
        code: emp.code,
        name: emp.name,
        days: days.map(d => ({
          day: d.day,
          dayType: d.day_type,
          checkIn: d.check_in,
          checkOut: d.check_out,
          shiftCode: d.shift_code,
        })),
        workCount, restCount, pnCount,
      });
    }

    await conn.close();
    return NextResponse.json(rows);
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
