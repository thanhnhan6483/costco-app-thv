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
        name=?, department_id=?, is_default=?, shift_type=?,
        window_start=?, clock_in=?, clock_out=?, window_end=?,
        late_minutes=?, ot_threshold=?, ot_calc=?, note=?
      WHERE id=?
    `, b.name, b.departmentId ?? null, b.isDefault ?? false, b.shiftType ?? 'Ca 1',
       b.windowStart ?? '', b.clockIn, b.clockOut, b.windowEnd ?? '',
       b.lateMinutes ?? 0, b.otThreshold ?? 0, b.otCalc ?? 'Tính từ giờ ra (công)',
       b.note ?? '', id);
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
