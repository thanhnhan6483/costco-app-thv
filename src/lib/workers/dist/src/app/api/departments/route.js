"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
/**
 * GET  /api/departments?month=<monthId>   – Lấy danh sách phòng ban theo tháng
 * POST /api/departments                    – Tạo phòng ban mới (body chứa monthId)
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function GET(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        const rows = await conn.all(`
      SELECT d.id, d.month_id AS monthId, d.code, d.name, d.parent_id AS parentId,
             p.name AS parentName,
             d.active, d.note, d.created_at AS createdAt
      FROM departments d
      LEFT JOIN departments p ON p.id = d.parent_id AND p.month_id = d.month_id
      WHERE d.month_id = ?
      ORDER BY d.code
    `, monthId);
        await conn.close();
        return server_1.NextResponse.json(rows);
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function POST(req) {
    try {
        const { id, code, name, parentId, note, createdAt, monthId } = await req.json();
        const mid = monthId ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        await conn.run(`INSERT INTO departments (id, month_id, code, name, parent_id, active, note, created_at) VALUES (?,?,?,?,?,TRUE,?,?)`, id, mid, code.toUpperCase(), name, parentId ?? null, note ?? '', createdAt);
        await conn.close();
        return server_1.NextResponse.json({ ok: true }, { status: 201 });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE'))
            return server_1.NextResponse.json({ error: 'Mã phòng ban đã tồn tại trong tháng này' }, { status: 409 });
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
