/**
 * GET  /api/shifts?month=<monthId>   – Ca làm việc theo tháng
 * POST /api/shifts                    – Tạo ca (body chứa monthId)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    const rows = await conn.all(`
      SELECT s.id, s.month_id AS monthId, s.name,
             s.department_id AS departmentId,
             d.name          AS departmentName,
             d.code          AS departmentCode,
             s.shift_type    AS shiftType,
             s.window_start  AS windowStart,
             s.clock_in      AS clockIn,
             s.clock_out     AS clockOut,
             s.window_end    AS windowEnd,
             s.ot_calc       AS otCalc,
             s.created_at    AS createdAt
      FROM shifts s
      LEFT JOIN departments d ON d.id = s.department_id AND d.month_id = s.month_id
      WHERE s.month_id = ?
      ORDER BY s.name
    `, monthId);
    await conn.close();
    return NextResponse.json(rows);
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const mid = b.monthId ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    await conn.run(`
      INSERT INTO shifts (id, month_id, name, department_id, shift_type,
        window_start, clock_in, clock_out, window_end, ot_calc, created_at)
      VALUES (?,?,?,?,?, ?,?,?,?,?,?)
    `, b.id, mid, b.name, b.departmentId ?? null, b.shiftType ?? 'Ca 1',
       b.windowStart ?? '', b.clockIn, b.clockOut, b.windowEnd ?? '',
       b.otCalc ?? 'Tính từ giờ ra (cộng)', b.createdAt);
    await conn.close();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}
