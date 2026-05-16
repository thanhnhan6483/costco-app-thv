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
        const shiftMap = await (0, stepHelpers_1.loadShiftMap)(monthId);
        // Load special_groups → map groupCode → work_hours
        const rawGroups = await conn.all(`SELECT code, work_hours AS workHours FROM special_groups WHERE month_id=?`, monthId);
        const specialGroupHours = new Map(rawGroups.map(g => [g.code.toUpperCase(), g.workHours]));
        const emps = await conn.all(`SELECT id, department_id AS departmentId, special_group AS specialGroup
       FROM employees WHERE month_id=? AND active=TRUE`, monthId);
        for (const emp of emps) {
            const groupCode = (emp.specialGroup ?? '').toUpperCase();
            const groupWorkHours = groupCode ? (specialGroupHours.get(groupCode) ?? null) : null;
            const entry = (0, stepHelpers_1.getShiftEntry)(shiftMap, emp.departmentId ?? null);
            const days = await conn.all(`SELECT day, day_type AS dayType, shift_code AS shiftCode, ot_hours AS otHours, late_mins AS lateMins
         FROM distribution_results WHERE month_id=? AND employee_id=? ORDER BY day`, monthId, emp.id);
            for (const d of days) {
                const { checkIn, checkOut } = (0, distributionEngine_1.step6_generateTime)(d.dayType, d.otHours, d.lateMins, d.shiftCode, entry.ca1, entry.ca2, groupWorkHours, params);
                await conn.run(`UPDATE distribution_results SET check_in=?, check_out=? WHERE month_id=? AND employee_id=? AND day=?`, checkIn, checkOut, monthId, emp.id, d.day);
            }
        }
        await (0, stepHelpers_1.markStepDone)(monthId, 6);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, step: 6, processed: emps.length });
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
        const rows = await conn.all(`SELECT e.code, e.name AS empName, d.name AS deptName,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              dr.day, dr.day_type AS dayType, dr.shift_code AS shiftCode,
              dr.check_in AS checkIn, dr.check_out AS checkOut,
              dr.ot_hours AS otHours, dr.late_mins AS lateMins
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
                    code: r.code, name: r.empName, deptName: r.deptName ?? '',
                    ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '',
                    days: [],
                });
            map.get(r.code).days.push({
                day: r.day, dayType: r.dayType, shiftCode: r.shiftCode ?? '',
                checkIn: r.checkIn ?? '', checkOut: r.checkOut ?? '',
                otHours: r.otHours ?? 0, lateMins: r.lateMins ?? 0,
            });
        }
        const result = Array.from(map.values()).map(emp => {
            const days = emp.days;
            emp.workCount = days.filter(d => d.dayType === 0).length;
            emp.lpCount = days.filter(d => d.dayType === 1).length;
            emp.pnCount = days.filter(d => d.dayType === 2).length;
            emp.totalOT = days.reduce((s, d) => s + (Number(d.otHours) || 0), 0);
            emp.totalLate = days.reduce((s, d) => s + (Number(d.lateMins) || 0), 0);
            return emp;
        });
        return server_1.NextResponse.json((0, paginate_1.buildPagedResponse)(result, Number(total), page, limit));
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
