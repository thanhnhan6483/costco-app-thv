"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const paginate_1 = require("@/lib/paginate");
exports.runtime = 'nodejs';
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
        const rows = await conn.all(`
      SELECT e.id AS empId, e.code, e.name AS empName, d.name AS deptName, e.workdays, e.special_group AS specialGroup,
             e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
             dr.day, dr.day_type AS dayType,
             dr.check_in AS checkIn, dr.check_out AS checkOut,
             dr.shift_code AS shiftCode, dr.ot_hours AS otHours, dr.late_mins AS lateMins
      FROM distribution_results dr
      JOIN employees e ON dr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE dr.month_id = ? AND dr.employee_id IN (${placeholders})
      ORDER BY e.code, dr.day
    `, monthId, ...ids);
        await conn.close();
        const empMap = new Map();
        for (const row of rows) {
            if (!empMap.has(row.empId)) {
                empMap.set(row.empId, {
                    code: row.code, name: row.empName, deptName: row.deptName ?? '',
                    ngayNghiCuoiThangTruoc: row.ngayNghiCuoiThangTruoc ?? '', workdays: row.workdays ?? '', specialGroup: row.specialGroup ?? '',
                    days: [], workCount: 0, lpCount: 0, pnCount: 0, totalOT: 0, totalLate: 0,
                });
            }
            const emp = empMap.get(row.empId);
            emp.days.push(row);
            if (row.dayType === 0)
                emp.workCount++;
            if (row.dayType === 1)
                emp.lpCount++;
            if (row.dayType === 2)
                emp.pnCount++;
            emp.totalOT += Number(row.otHours) || 0;
            emp.totalLate += Number(row.lateMins) || 0;
        }
        return server_1.NextResponse.json((0, paginate_1.buildPagedResponse)([...empMap.values()], Number(total), page, limit));
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
