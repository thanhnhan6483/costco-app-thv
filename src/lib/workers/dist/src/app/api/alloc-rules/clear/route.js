"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function POST() {
    const conn = await (0, db_1.getConn)();
    await conn.run('DELETE FROM alloc_rules');
    await conn.close();
    return server_1.NextResponse.json({ ok: true });
}
