import { NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';
export async function POST() {
  const conn = await getConn();
  await conn.run('DELETE FROM alloc_rules');
  await conn.close();
  return NextResponse.json({ ok: true });
}
