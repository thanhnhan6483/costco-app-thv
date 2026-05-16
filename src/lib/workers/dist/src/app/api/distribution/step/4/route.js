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
        const shiftMap = await (0, stepHelpers_1.loadShiftMap)(monthId);
        const emps = await conn.all(`SELECT id, department_id AS departmentId FROM employees WHERE month_id = ? AND active = TRUE`, monthId);
        for (const emp of emps) {
            const deptId = emp.departmentId ?? null;
            const entry = (0, stepHelpers_1.getShiftEntry)(shiftMap, deptId);
            // isCommonShift = true nếu phòng ban không có ca riêng (dùng ca DEFAULT)
            const hasDeptShift = deptId ? shiftMap.has(deptId) : false;
            const isCommonShift = !hasDeptShift;
            const days = await conn.all(`SELECT day, day_type AS dayType FROM distribution_results WHERE month_id = ? AND employee_id = ? ORDER BY day`, monthId, emp.id);
            const assigned = (0, distributionEngine_1.step4_assignShiftsBatch)(days, entry.ca1, entry.ca2, isCommonShift);
            for (const a of assigned) {
                await conn.run(`UPDATE distribution_results SET shift_code=? WHERE month_id=? AND employee_id=? AND day=?`, a.shiftCode, monthId, emp.id, a.day);
            }
        }
        await (0, stepHelpers_1.markStepDone)(monthId, 4);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, step: 4, processed: emps.length });
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
        const [{ total }] = await conn.all(`SELECT COUNT(DISTINCT employee_id) AS total FROM distribution_results WHERE month_id = ?`, monthId);
        const empIds = await conn.all(`SELECT DISTINCT dr.employee_id AS empId FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ? ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset);
        if (empIds.length === 0) {
            await conn.close();
            return server_1.NextResponse.json((0, paginate_1.buildPagedResponse)([], Number(total), page, limit));
        }
        const ids = empIds.map(r => r.empId);
        const placeholders = ids.map(() => '?').join(',');
        const rows = await conn.all(`SELECT e.code, e.name AS empName, d.name AS deptName, e.workdays, dr.day, dr.day_type, dr.shift_code
       FROM distribution_results dr JOIN employees e ON dr.employee_id=e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id=? AND dr.employee_id IN (${placeholders})
       ORDER BY e.code, dr.day`, monthId, ...ids);
        await conn.close();
        const map = new Map();
        for (const r of rows) {
            if (!map.has(r.code))
                map.set(r.code, { code: r.code, name: r.empName, deptName: r.deptName ?? '', workdays: r.workdays ?? '', days: [] });
            map.get(r.code).days.push({ day: r.day, dayType: r.day_type, shiftCode: r.shift_code });
        }
        return server_1.NextResponse.json((0, paginate_1.buildPagedResponse)(Array.from(map.values()), Number(total), page, limit));
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
