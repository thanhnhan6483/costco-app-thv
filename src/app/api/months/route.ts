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
    const rows = await conn.all(`
      SELECT id, label, month, from_date AS fromDate, to_date AS toDate,
             note, created_at AS createdAt
      FROM months
      ORDER BY month DESC
    `);
    await conn.close();
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
      id, label ?? '', month, fromDate, toDate, note ?? '', createdAt,
    );
    await conn.close();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: `Tháng đã tồn tại` }, { status: 409 });
    }
    console.error('[POST /api/months]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
