"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const stepHelpers_1 = require("@/lib/stepHelpers");
const paginate_1 = require("@/lib/paginate");
exports.runtime = 'nodejs';
// GET — dữ liệu import theo trang
async function GET(req) {
    const url = new URL(req.url);
    const monthId = url.searchParams.get('month') ?? '';
    const { page, limit, offset } = (0, paginate_1.parsePage)(url);
    const conn = await (0, db_1.getConn)();
    try {
        const [{ total }] = await conn.all(`SELECT COUNT(*) AS total FROM employees WHERE month_id = ? AND active = TRUE`, monthId);
        const empPage = await conn.all(`SELECT e.id, e.code, e.name, d.name AS deptName,
              e.special_group AS specialGroup,
              e.group_code_end_date AS groupCodeEndDate,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              e.workdays, e.overtime_hours AS overtimeHours,
              e.late_minutes AS lateMinutes, e.phep_nam AS phepNam,
              ${stepHelpers_1.DAY_COLS.map(c => `e.${c}`).join(', ')}
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ? AND e.active = TRUE
       ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset);
        const data = empPage.map(emp => ({
            id: emp.id, code: emp.code, name: emp.name,
            deptName: emp.deptName ?? '',
            specialGroup: emp.specialGroup ?? '',
            ngayNghiCuoiThangTruoc: emp.ngayNghiCuoiThangTruoc ?? '',
            workdays: emp.workdays, overtimeHours: emp.overtimeHours,
            lateMinutes: emp.lateMinutes, phepNam: emp.phepNam,
            days: stepHelpers_1.DAY_COLS.map((c, i) => ({ day: i + 1, symbol: (emp[c] ?? '').trim() })),
        }));
        await conn.close();
        return server_1.NextResponse.json((0, paginate_1.buildPagedResponse)(data, Number(total), page, limit));
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
// POST — đánh dấu step 2 done (người dùng đã xem và xác nhận)
async function POST(req) {
    const { monthId } = await req.json();
    await (0, stepHelpers_1.markStepDone)(monthId, 2);
    return server_1.NextResponse.json({ ok: true, step: 2 });
}
