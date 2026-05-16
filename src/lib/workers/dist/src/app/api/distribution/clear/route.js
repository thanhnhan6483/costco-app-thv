"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function POST(req) {
    const { monthId } = await req.json();
    if (!monthId)
        return server_1.NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
    const conn = await (0, db_1.getConn)();
    try {
        await conn.run(`DELETE FROM distribution_results WHERE month_id = ?`, monthId);
        await conn.run(`DELETE FROM distribution_status  WHERE month_id = ?`, monthId);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, monthId });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
