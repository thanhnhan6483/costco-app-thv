"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const stepHelpers_1 = require("@/lib/stepHelpers");
const distributionEngine_1 = require("@/lib/distributionEngine");
const paginate_1 = require("@/lib/paginate");
exports.runtime = 'nodejs';
async function POST(req) {
    const { monthId } = await req.json();
    const conn = await (0, db_1.getConn)();
    try {
        const params = await (0, stepHelpers_1.loadParams)(monthId);
        const emps = await conn.all(`SELECT id, overtime_hours AS overtimeHours, late_minutes AS lateMinutes
       FROM employees WHERE month_id = ? AND active = TRUE`, monthId);
        for (const emp of emps) {
            const days = await conn.all(`SELECT day, day_type AS dayType FROM distribution_results WHERE month_id=? AND employee_id=? ORDER BY day`, monthId, emp.id);
            const arrangement = days.map(d => d.dayType);
            const otH = parseFloat(emp.overtimeHours) || 0;
            const latM = parseFloat(emp.lateMinutes) || 0;
            const dist = (0, distributionEngine_1.step5_distributeOTLate)(arrangement, otH, latM, params);
            for (let i = 0; i < days.length; i++) {
                await conn.run(`UPDATE distribution_results SET ot_hours=?, late_mins=? WHERE month_id=? AND employee_id=? AND day=?`, dist[i].otH, dist[i].lateM, monthId, emp.id, days[i].day);
            }
        }
        await (0, stepHelpers_1.markStepDone)(monthId, 5);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, step: 5, processed: emps.length });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
async function GET(req) {
    const url = new URL(req.url);
    const monthId = url.searchParams.get('month') ?? '';
    const { page, limit, offset } = (0, paginate_1.parsePage)(url);
    const conn = await (0, db_1.getConn)();
    try {
        const [{ total }] = await conn.all(`SELECT COUNT(DISTINCT e.id) AS total FROM employees e WHERE e.month_id = ? AND e.active = TRUE`, monthId);
        const empIds = await conn.all(`SELECT e.id AS empId FROM employees e
       WHERE e.month_id = ? AND e.active = TRUE
       ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset);
        if (empIds.length === 0) {
            await conn.close();
            return server_1.NextResponse.json((0, paginate_1.buildPagedResponse)([], Number(total), page, limit));
        }
        const ids = empIds.map(r => r.empId);
        const placeholders = ids.map(() => '?').join(',');
        const rows = await conn.all(`SELECT e.code, e.name AS empName, d.name AS deptName, e.workdays,
              dr.day, dr.day_type AS dayType, dr.ot_hours AS otH, dr.late_mins AS lateM
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id = ? AND dr.employee_id IN (${placeholders})
       ORDER BY e.code, dr.day`, monthId, ...ids);
        await conn.close();
        const map = new Map();
        for (const r of rows) {
            if (!map.has(r.code))
                map.set(r.code, {
                    code: r.code, name: r.empName, deptName: r.deptName ?? '', workdays: r.workdays ?? '',
                    totalOT: 0, totalLate: 0, days: [],
                });
            const emp = map.get(r.code);
            emp.days.push({ day: r.day, dayType: r.dayType, otH: r.otH, lateM: r.lateM });
            emp.totalOT += Number(r.otH) || 0;
            emp.totalLate += Number(r.lateM) || 0;
        }
        return server_1.NextResponse.json((0, paginate_1.buildPagedResponse)(Array.from(map.values()), Number(total), page, limit));
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
