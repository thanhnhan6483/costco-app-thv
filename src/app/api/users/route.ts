import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const conn = await getConn();
  const rows = await conn.all<{ id: string; username: string; full_name: string; role: string; note: string; created_at: string }>(
    `SELECT id, username, full_name, role, note, created_at FROM users ORDER BY created_at`
  );
  await conn.close();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { username, password, role = 'admin', full_name = '', note = '' } = await req.json();
  if (!username || !password)
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

  const conn = await getConn();
  try {
    const hash = await bcrypt.hash(password, 10);
    const id = `user_${Date.now()}`;
    await conn.run(
      `INSERT INTO users (id, username, password_hash, role, full_name, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, username, hash, role, full_name, note, new Date().toISOString().slice(0, 10)
    );
    await conn.close();
    return NextResponse.json({ ok: true, id });
  } catch (e: unknown) {
    await conn.close();
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE') || msg.includes('unique constraint'))
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
