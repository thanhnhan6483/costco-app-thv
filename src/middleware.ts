import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from './lib/session';
import { sessionOptions } from './lib/session';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)'],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  try {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);
    if (!session.user) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  } catch {
    // Nếu lỗi session → redirect login
    if (!req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
  return res;
}
