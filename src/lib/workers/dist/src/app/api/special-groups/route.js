"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
/**
 * GET  /api/special-groups?month=<monthId>
 * POST /api/special-groups  (body chứa monthId)
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function GET(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        const rows = await conn.all(`SELECT id, month_id AS monthId, code, name, work_hours AS workHours, note, created_at AS createdAt
       FROM special_groups WHERE month_id = ? ORDER BY code`, monthId);
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
        const { id, code, name, workHours, note, createdAt, monthId } = await req.json();
        const mid = monthId ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        await conn.run(`INSERT INTO special_groups (id,month_id,code,name,work_hours,note,created_at) VALUES (?,?,?,?,?,?,?)`, id, mid, code.toUpperCase(), name, workHours ?? 8.0, note ?? '', createdAt);
        await conn.close();
        return server_1.NextResponse.json({ ok: true }, { status: 201 });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE'))
            return server_1.NextResponse.json({ error: 'Mã nhóm đã tồn tại' }, { status: 409 });
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
