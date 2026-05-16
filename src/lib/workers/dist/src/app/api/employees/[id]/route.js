"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PUT = PUT;
exports.DELETE = DELETE;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const { code, name, departmentId, specialGroup, groupCodeEndDate, ngayNghiCuoiThangTruoc, soNgayLamCuoiThangTruoc, workdays, overtimeHours, lateMinutes, phepNam, days } = await req.json();
        const daySetList = Array.from({ length: 31 }, (_, i) => `day_${i + 1}=?`).join(', ');
        const dayVals = Array.from({ length: 31 }, (_, i) => days?.[i] ?? '');
        const conn = await (0, db_1.getConn)();
        await conn.run(`UPDATE employees SET code=?, name=?, department_id=?, special_group=?, group_code_end_date=?,
         ngay_nghi_cuoi_thang_truoc=?, so_ngay_lam_cuoi_thang_truoc=?,
         workdays=?, overtime_hours=?, late_minutes=?, phep_nam=?, ${daySetList} WHERE id=?`, code, name, departmentId ?? '', specialGroup ?? '', groupCodeEndDate ?? '', ngayNghiCuoiThangTruoc ?? '', soNgayLamCuoiThangTruoc ?? 0, workdays ?? '', overtimeHours ?? '', lateMinutes ?? '', phepNam ?? '', ...dayVals, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE'))
            return server_1.NextResponse.json({ error: 'Mã nhân viên đã tồn tại' }, { status: 409 });
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function DELETE(_req, { params }) {
    try {
        const { id } = await params;
        const conn = await (0, db_1.getConn)();
        await conn.run(`DELETE FROM employees WHERE id=?`, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error('[DELETE /api/employees]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function PATCH(_req, { params }) {
    try {
        const { id } = await params;
        const conn = await (0, db_1.getConn)();
        await conn.run(`UPDATE employees SET active = NOT active WHERE id=?`, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error('[PATCH /api/employees]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
