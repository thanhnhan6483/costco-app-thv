import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

// PATCH: đổi mật khẩu
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { password, full_name, note } = await req.json();

  const conn = await getConn();
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await conn.run(`UPDATE users SET password_hash = ? WHERE id = ?`, hash, id);
  }
  if (full_name !== undefined) await conn.run(`UPDATE users SET full_name = ? WHERE id = ?`, full_name, id);
  if (note !== undefined)      await conn.run(`UPDATE users SET note = ? WHERE id = ?`, note, id);
  await conn.close();
  return NextResponse.json({ ok: true });
}

// DELETE: xóa user
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conn = await getConn();
  // Không cho xóa nếu chỉ còn 1 user
  const [{ cnt }] = await conn.all<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM users`);
  if (cnt <= 1) {
    await conn.close();
    return NextResponse.json({ error: 'Không thể xóa tài khoản duy nhất' }, { status: 400 });
  }
  await conn.run(`DELETE FROM users WHERE id = ?`, id);
  await conn.close();
  return NextResponse.json({ ok: true });
}
