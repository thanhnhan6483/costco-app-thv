"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
/** POST /api/employees/bulk-set-field
 *  Body: { monthId, field, value }
 *  Update một cột cho toàn bộ nhân viên của tháng.
 */
const ALLOWED_FIELDS = ['ngay_nghi_cuoi_thang_truoc', 'so_ngay_lam_cuoi_thang_truoc', 'workdays', 'overtime_hours', 'late_minutes', 'phep_nam'];
async function POST(req) {
    try {
        const { monthId, field, value } = await req.json();
        if (!ALLOWED_FIELDS.includes(field)) {
            return server_1.NextResponse.json({ error: `Field '${field}' không được phép` }, { status: 400 });
        }
        const conn = await (0, db_1.getConn)();
        const result = await conn.all(`SELECT COUNT(*) AS cnt FROM employees WHERE month_id = ?`, monthId);
        const cnt = Number(result[0].cnt);
        await conn.run(`UPDATE employees SET ${field} = ? WHERE month_id = ?`, value, monthId);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, updated: cnt, field, value, monthId });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
