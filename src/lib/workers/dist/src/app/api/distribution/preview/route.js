"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function GET(req) {
    const { searchParams } = new URL(req.url);
    const monthId = searchParams.get('month') ?? 'month_jan2026';
    const limit = parseInt(searchParams.get('limit') ?? '10');
    const conn = await (0, db_1.getConn)();
    try {
        // Lấy danh sách employee_id (limit)
        const emps = await conn.all(`SELECT id, code, name FROM employees WHERE month_id = ? AND active = TRUE LIMIT ?`, monthId, limit);
        const rows = [];
        for (const emp of emps) {
            const days = await conn.all(`SELECT day, day_type, check_in, check_out, shift_code
         FROM distribution_results WHERE month_id = ? AND employee_id = ?
         ORDER BY day`, monthId, emp.id);
            const workCount = days.filter(d => d.day_type === 0).length;
            const restCount = days.filter(d => d.day_type === 1).length;
            const pnCount = days.filter(d => d.day_type === 2).length;
            rows.push({
                employee_id: emp.id,
                code: emp.code,
                name: emp.name,
                days: days.map(d => ({
                    day: d.day,
                    dayType: d.day_type,
                    checkIn: d.check_in,
                    checkOut: d.check_out,
                    shiftCode: d.shift_code,
                })),
                workCount, restCount, pnCount,
            });
        }
        await conn.close();
        return server_1.NextResponse.json(rows);
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
