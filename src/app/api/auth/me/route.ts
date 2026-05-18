import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const res = NextResponse.json({});
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ user: null }, { status: 401 });

  const conn = await getConn();
  const [row] = await conn.all<{ full_name: string }>(
    `SELECT full_name FROM users WHERE id = ?`, session.user.id
  );
  await conn.close();

  return NextResponse.json({ user: { ...session.user, full_name: row?.full_name ?? '' } });
}
