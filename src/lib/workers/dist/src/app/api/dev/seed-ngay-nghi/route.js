"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
const DAYS = ['26/09/2025', '27/09/2025', '28/09/2025', '29/09/2025', '30/09/2025'];
async function POST(req) {
    const { monthId, target = 1000 } = await req.json().catch(() => ({}));
    const mid = monthId ?? db_1.DEFAULT_MONTH_ID;
    const conn = await (0, db_1.getConn)();
    try {
        // Reset tất cả về rỗng
        await conn.run(`UPDATE employees SET ngay_nghi_cuoi_thang_truoc = '' WHERE month_id = ?`, mid);
        // Lấy toàn bộ id
        const emps = await conn.all(`SELECT id FROM employees WHERE month_id = ? ORDER BY code`, mid);
        const total = emps.length;
        // Shuffle và chọn 'target' NV
        const shuffled = [...emps].sort(() => Math.random() - 0.5).slice(0, Math.min(target, total));
        // Batch update
        for (const emp of shuffled) {
            const day = DAYS[Math.floor(Math.random() * DAYS.length)];
            await conn.run(`UPDATE employees SET ngay_nghi_cuoi_thang_truoc = ? WHERE id = ?`, day, emp.id);
        }
        await conn.close();
        return server_1.NextResponse.json({ ok: true, total, updated: shuffled.length, monthId: mid });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
