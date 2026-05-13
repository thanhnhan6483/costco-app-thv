import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { code, name, description, paid, note, dayType } = await req.json();
    const conn = await getConn();
    await conn.run(
      `UPDATE leave_types SET code=?, name=?, description=?, paid=?, note=?, day_type=? WHERE id=?`,
      code?.toUpperCase(), name, description ?? '', paid, note ?? '', dayType ?? -1, id
    );
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Mã loại nghỉ đã tồn tại' }, { status: 409 });
    console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conn = await getConn();
    await conn.run(`DELETE FROM leave_types WHERE id=?`, id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}
