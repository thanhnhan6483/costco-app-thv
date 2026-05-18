import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import { getConn } from '@/lib/db';
import { sessionOptions, SessionData } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password)
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

  const conn = await getConn();
  const rows = await conn.all<{ id: string; username: string; password_hash: string; role: string }>(
    `SELECT id, username, password_hash, role FROM users WHERE username = ?`, username
  );
  await conn.close();

  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
    return NextResponse.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.user = { id: rows[0].id, username: rows[0].username, role: rows[0].role };
  await session.save();
  return res;
}
