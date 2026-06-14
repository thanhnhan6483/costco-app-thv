import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await req.json();
    const conn = await getConn();
    await conn.run(`
      UPDATE shifts SET
        name=?, department_id=?, shift_type=?,
        window_start=?, clock_in=?, clock_out=?, window_end=?, ot_calc=?
      WHERE id=?
    `, b.name, b.departmentId ?? null, b.shiftType ?? 'Ca 1',
       b.windowStart ?? '', b.clockIn, b.clockOut, b.windowEnd ?? '',
       b.otCalc ?? 'Tính từ giờ ra (cộng)', id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conn = await getConn();
    await conn.run(`DELETE FROM shifts WHERE id=?`, id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}
