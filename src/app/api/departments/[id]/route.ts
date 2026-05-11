import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { code, name, parentId, note } = await req.json();
    const conn = await getConn();
    await conn.run(
      `UPDATE departments SET code=?, name=?, parent_id=?, note=? WHERE id=?`,
      code?.toUpperCase(), name, parentId ?? null, note ?? '', id
    );
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Mã phòng ban đã tồn tại' }, { status: 409 });
    console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conn = await getConn();
    await conn.run(`UPDATE departments SET active = NOT active WHERE id=?`, id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conn = await getConn();
    await conn.run(`DELETE FROM departments WHERE id=?`, id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}
