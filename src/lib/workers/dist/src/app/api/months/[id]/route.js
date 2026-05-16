"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PUT = PUT;
exports.DELETE = DELETE;
/**
 * PUT    /api/months/[id]  – Cập nhật tháng
 * DELETE /api/months/[id]  – Xóa tháng + CASCADE toàn bộ cấu hình liên quan
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
/* ── PUT ──────────────────────────────────────── */
async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const { label, fromDate, toDate, note } = await req.json();
        const conn = await (0, db_1.getConn)();
        await conn.run(`UPDATE months SET label=?, from_date=?, to_date=?, note=? WHERE id=?`, label ?? '', fromDate, toDate, note ?? '', id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error('[PUT /api/months]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
/* ── DELETE ───────────────────────────────────── */
/* Cascade xóa toàn bộ cấu hình của tháng đó trong 1 transaction */
async function DELETE(_req, { params }) {
    const conn = await (0, db_1.getConn)();
    try {
        const { id } = await params;
        await conn.run('BEGIN TRANSACTION');
        // Xóa tất cả dữ liệu cấu hình thuộc tháng này
        await conn.run(`DELETE FROM departments   WHERE month_id = ?`, id);
        await conn.run(`DELETE FROM shifts        WHERE month_id = ?`, id);
        await conn.run(`DELETE FROM leave_types   WHERE month_id = ?`, id);
        await conn.run(`DELETE FROM special_groups WHERE month_id = ?`, id);
        await conn.run(`DELETE FROM alloc_rules   WHERE month_id = ?`, id);
        await conn.run(`DELETE FROM employees     WHERE month_id = ?`, id);
        // Xóa bản ghi tháng
        await conn.run(`DELETE FROM months WHERE id = ?`, id);
        await conn.run('COMMIT');
        await conn.close();
        return server_1.NextResponse.json({
            ok: true,
            message: `Đã xóa tháng và toàn bộ cấu hình liên quan`,
        });
    }
    catch (e) {
        try {
            await conn.run('ROLLBACK');
        }
        catch { /* ignore */ }
        await conn.close();
        console.error('[DELETE /api/months]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
