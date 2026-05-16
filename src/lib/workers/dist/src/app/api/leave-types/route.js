"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
/**
 * GET  /api/leave-types?month=<monthId>
 * POST /api/leave-types  (body chứa monthId)
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function GET(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        let rows;
        try {
            rows = await conn.all(`SELECT id, month_id AS monthId, code, name, description, paid, note, COALESCE(day_type, -1) AS dayType, created_at AS createdAt
         FROM leave_types WHERE month_id = ? ORDER BY code`, monthId);
        }
        catch {
            // Fallback nếu cột day_type chưa tồn tại
            rows = await conn.all(`SELECT id, month_id AS monthId, code, name, description, paid, note, -1 AS dayType, created_at AS createdAt
         FROM leave_types WHERE month_id = ? ORDER BY code`, monthId);
        }
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
        const { id, code, name, description, paid, note, dayType, createdAt, monthId } = await req.json();
        const mid = monthId ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        await conn.run(`INSERT INTO leave_types (id,month_id,code,name,description,paid,note,day_type,created_at) VALUES (?,?,?,?,?,?,?,?,?)`, id, mid, code.toUpperCase(), name, description ?? '', paid ?? true, note ?? '', dayType ?? -1, createdAt);
        await conn.close();
        return server_1.NextResponse.json({ ok: true }, { status: 201 });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE'))
            return server_1.NextResponse.json({ error: 'Mã loại nghỉ đã tồn tại' }, { status: 409 });
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
