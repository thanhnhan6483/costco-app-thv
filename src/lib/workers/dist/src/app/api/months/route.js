"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
/**
 * GET  /api/months        – Lấy tất cả tháng
 * POST /api/months        – Tạo tháng mới
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
/* ── GET ──────────────────────────────────────── */
async function GET() {
    try {
        const conn = await (0, db_1.getConn)();
        // Check if locked column exists
        const cols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='months'`);
        const hasLocked = cols.some(c => c.column_name === 'locked');
        if (!hasLocked) {
            await conn.run(`ALTER TABLE months ADD COLUMN locked BOOLEAN DEFAULT FALSE`);
        }
        const rows = await conn.all(`
      SELECT id, label, month, from_date AS fromDate, to_date AS toDate,
             note, created_at AS createdAt, COALESCE(locked, FALSE) AS locked
      FROM months
      ORDER BY month DESC
    `);
        await conn.close();
        return server_1.NextResponse.json(rows);
    }
    catch (e) {
        console.error('[GET /api/months]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
/* ── POST ─────────────────────────────────────── */
async function POST(req) {
    try {
        const body = await req.json();
        const { id, label, month, fromDate, toDate, note, createdAt } = body;
        const conn = await (0, db_1.getConn)();
        await conn.run(`INSERT INTO months (id, label, month, from_date, to_date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, id, label ?? '', month, fromDate, toDate, note ?? '', createdAt);
        await conn.close();
        return server_1.NextResponse.json({ ok: true }, { status: 201 });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE')) {
            return server_1.NextResponse.json({ error: `Tháng đã tồn tại` }, { status: 409 });
        }
        console.error('[POST /api/months]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
