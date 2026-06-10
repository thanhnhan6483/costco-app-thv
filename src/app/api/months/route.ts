/**
 * GET  /api/months        – Lấy tất cả tháng
 * POST /api/months        – Tạo tháng mới
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

/* ── GET ──────────────────────────────────────── */
export async function GET() {
  try {
    const conn = await getConn();
    const cols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='months'`
    );
    const hasLocked = cols.some(c => c.column_name === 'locked');
    if (!hasLocked) {
      await conn.run(`ALTER TABLE months ADD COLUMN locked BOOLEAN DEFAULT FALSE`);
    }
    const rows = await conn.all(`
      SELECT id, label, month, from_date AS fromDate, to_date AS toDate,
             note, created_at AS createdAt, COALESCE(locked, FALSE) AS locked
      FROM months
      ORDER BY created_at DESC
    `);
    try { await conn.close(); } catch { /* ignore */ }
    return NextResponse.json(rows);
  } catch (e) {
    console.error('[GET /api/months]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

/* ── POST ─────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, label, month, fromDate, toDate, note, createdAt } = body;

    const conn = await getConn();
    await conn.run(
      `INSERT INTO months (id, label, month, from_date, to_date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, label ?? '', month ?? '', fromDate, toDate, note ?? '', createdAt,
    );
    try { await conn.close(); } catch { /* ignore close error */ }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[POST /api/months]', e);
    return NextResponse.json({ error: `DB error: ${msg}` }, { status: 500 });
  }
}
