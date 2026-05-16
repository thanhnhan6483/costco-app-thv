"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
/**
 * POST /api/employees/relink?month=<monthId>
 * Re-link employees với departments dựa trên ma_pb (trong cùng tháng)
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function POST(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        // Lấy departments của tháng này
        const depts = await conn.all(`SELECT id, code FROM departments WHERE month_id = ?`, monthId);
        const deptMap = {};
        depts.forEach(d => { deptMap[d.code.toUpperCase()] = d.id; });
        // Lấy employees của tháng này chưa link
        const emps = await conn.all(`SELECT id, code, ma_pb FROM employees
       WHERE month_id = ? AND (department_id = '' OR department_id IS NULL) AND ma_pb <> ''`, monthId);
        let linked = 0;
        const notFound = [];
        for (const e of emps) {
            const deptId = deptMap[e.ma_pb.toUpperCase()];
            if (deptId) {
                await conn.run(`UPDATE employees SET department_id=? WHERE id=?`, deptId, e.id);
                linked++;
            }
            else {
                notFound.push(e.ma_pb);
            }
        }
        await conn.close();
        return server_1.NextResponse.json({
            ok: true,
            linked,
            notFound: [...new Set(notFound)],
            totalChecked: emps.length,
        });
    }
    catch (e) {
        console.error('[POST /api/employees/relink]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
