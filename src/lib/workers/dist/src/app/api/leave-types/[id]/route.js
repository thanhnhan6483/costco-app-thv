"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const { code, name, description, paid, note, dayType } = await req.json();
        const conn = await (0, db_1.getConn)();
        await conn.run(`UPDATE leave_types SET code=?, name=?, description=?, paid=?, note=?, day_type=? WHERE id=?`, code?.toUpperCase(), name, description ?? '', paid, note ?? '', dayType ?? -1, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE'))
            return server_1.NextResponse.json({ error: 'Mã loại nghỉ đã tồn tại' }, { status: 409 });
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function DELETE(_req, { params }) {
    try {
        const { id } = await params;
        const conn = await (0, db_1.getConn)();
        await conn.run(`DELETE FROM leave_types WHERE id=?`, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
