"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function POST(req, { params }) {
    const { id } = await params;
    const { locked } = await req.json();
    const conn = await (0, db_1.getConn)();
    try {
        await conn.run(`UPDATE months SET locked = ? WHERE id = ?`, locked, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, locked });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
