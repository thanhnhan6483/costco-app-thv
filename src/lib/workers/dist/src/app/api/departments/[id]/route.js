"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PUT = PUT;
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const { code, name, parentId, note } = await req.json();
        const conn = await (0, db_1.getConn)();
        await conn.run(`UPDATE departments SET code=?, name=?, parent_id=?, note=? WHERE id=?`, code?.toUpperCase(), name, parentId ?? null, note ?? '', id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE'))
            return server_1.NextResponse.json({ error: 'Mã phòng ban đã tồn tại' }, { status: 409 });
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function PATCH(_req, { params }) {
    try {
        const { id } = await params;
        const conn = await (0, db_1.getConn)();
        await conn.run(`UPDATE departments SET active = NOT active WHERE id=?`, id);
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
        await conn.run(`DELETE FROM departments WHERE id=?`, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
