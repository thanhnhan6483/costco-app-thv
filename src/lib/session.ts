import { SessionOptions } from 'iron-session';

export interface SessionData {
  user?: { id: string; username: string; role: string };
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'costco-secret-key-change-in-production-32chars',
  cookieName: 'costco_session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' },
};
