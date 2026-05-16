"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PUT = PUT;
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const route_1 = require("../route");
exports.runtime = 'nodejs';
async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const { name, defaultParam, specificValue, description, groupCode, groupName, paramKey } = await req.json();
        const conn = await (0, db_1.getConn)();
        await conn.run(`UPDATE alloc_rules SET name=?,param_key=?,default_param=?,specific_value=?,description=?,group_code=?,group_name=? WHERE id=?`, (0, route_1.toDb)(name), (0, route_1.toDb)(paramKey ?? ''), (0, route_1.toDb)(defaultParam ?? ''), (0, route_1.toDb)(specificValue ?? ''), (0, route_1.toDb)(description ?? ''), (0, route_1.toDb)(groupCode ?? 'WORK_RULE'), (0, route_1.toDb)(groupName ?? 'Quy tắc làm việc'), id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function PATCH(_req, { params }) {
    try {
        const { id } = await params;
        const conn = await (0, db_1.getConn)();
        await conn.run(`UPDATE alloc_rules SET active = NOT active WHERE id=?`, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function DELETE(_req, { params }) {
    try {
        const { id } = await params;
        const conn = await (0, db_1.getConn)();
        await conn.run(`DELETE FROM alloc_rules WHERE id=?`, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
