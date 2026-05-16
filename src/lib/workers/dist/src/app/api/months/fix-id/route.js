"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
/**
 * POST /api/months/fix-id
 * Cập nhật ID tháng cũ (timestamp) thành ID chuẩn 'month_jan2026'
 * để khớp với dữ liệu departments/shifts/employees đã migrate.
 *
 * Chạy 1 lần: POST http://localhost:3000/api/months/fix-id
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function POST() {
    try {
        const conn = await (0, db_1.getConn)();
        // Tìm tháng 01/2026 có ID khác month_jan2026
        const rows = await conn.all(`SELECT id FROM months WHERE month = '01/2026' AND id != 'month_jan2026'`);
        if (rows.length === 0) {
            await conn.close();
            return server_1.NextResponse.json({ ok: true, message: 'Không cần fix – tháng 01/2026 đã có ID đúng' });
        }
        const oldId = rows[0].id;
        // Cập nhật ID trong bảng months
        await conn.run(`UPDATE months SET id = 'month_jan2026' WHERE id = ?`, oldId);
        await conn.close();
        return server_1.NextResponse.json({
            ok: true,
            message: `Đã cập nhật ID tháng 01/2026 từ '${oldId}' → 'month_jan2026'`,
        });
    }
    catch (e) {
        console.error('[POST /api/months/fix-id]', e);
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
