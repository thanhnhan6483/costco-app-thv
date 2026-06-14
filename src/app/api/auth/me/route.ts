import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const res = NextResponse.json({});
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ user: null }, { status: 401 });

  let conn;
  try {
    conn = await getConn();
    const [row] = await conn.all<{ full_name: string }>(
      `SELECT full_name FROM users WHERE id = ?`, session.user.id
    );
    return NextResponse.json({ user: { ...session.user, full_name: row?.full_name ?? '' } });
  } catch (e) {
    console.error('[GET /api/auth/me]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
}
