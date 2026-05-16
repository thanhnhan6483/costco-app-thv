"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
exports.DELETE = DELETE;
/**
 * GET  /api/employees?month=<monthId>
 * POST /api/employees  (body chứa monthId)
 * DELETE /api/employees?month=<monthId>  – Xóa toàn bộ nhân viên của 1 tháng
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
const DAY_COLS = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`);
const SELECT_DAYS = DAY_COLS.map(c => `e.${c}`).join(', ');
async function GET(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'));
        const limit = Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '0'));
        const conn = await (0, db_1.getConn)();
        // Nếu không có page/limit → trả về toàn bộ (backward compat cho export/import)
        const paginate = req.nextUrl.searchParams.has('page');
        const totalRes = await conn.all(`SELECT COUNT(*) AS cnt FROM employees WHERE month_id = ?`, monthId);
        const total = Number(totalRes[0].cnt);
        const effectiveLimit = paginate ? (limit || 100) : total;
        const offset = paginate ? (page - 1) * effectiveLimit : 0;
        const rows = await conn.all(`
      SELECT e.id, e.month_id AS monthId, e.code, e.name,
             e.department_id    AS departmentId,
             e.ma_pb            AS maPb,
             COALESCE(d1.code, d2.code) AS departmentCode,
             COALESCE(d1.name, d2.name) AS departmentName,
             e.special_group    AS specialGroup,
             sg.name            AS specialGroupName,
             e.group_code_end_date AS groupCodeEndDate,
             e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
             e.workdays, e.overtime_hours AS overtimeHours,
             e.late_minutes AS lateMinutes, e.phep_nam AS phepNam,
             ${SELECT_DAYS},
             e.active, e.created_at AS createdAt
      FROM employees e
      LEFT JOIN departments d1 ON d1.id = e.department_id AND d1.month_id = e.month_id AND e.department_id <> ''
      LEFT JOIN departments d2 ON UPPER(d2.code) = UPPER(e.ma_pb) AND d2.month_id = e.month_id AND e.ma_pb <> ''
      LEFT JOIN special_groups sg ON UPPER(sg.code) = UPPER(e.special_group) AND sg.month_id = e.month_id AND e.special_group <> ''
      WHERE e.month_id = ?
      ORDER BY e.code
      LIMIT ? OFFSET ?
    `, monthId, effectiveLimit, offset);
        await conn.close();
        if (paginate) {
            const totalPages = Math.ceil(total / effectiveLimit);
            return server_1.NextResponse.json({ data: rows, page, limit: effectiveLimit, total, totalPages });
        }
        return server_1.NextResponse.json(rows);
    }
    catch (e) {
        console.error('[GET /api/employees]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function POST(req) {
    try {
        const body = await req.json();
        const { id, code, name, departmentId, specialGroup, groupCodeEndDate, ngayNghiCuoiThangTruoc, soNgayLamCuoiThangTruoc, workdays, overtimeHours, lateMinutes, phepNam, days, createdAt, monthId } = body;
        const mid = monthId ?? db_1.DEFAULT_MONTH_ID;
        const dayVals = DAY_COLS.map((_, i) => days?.[i] ?? '');
        const dayPlaceholders = DAY_COLS.map(() => '?').join(', ');
        const dayColList = DAY_COLS.join(', ');
        const conn = await (0, db_1.getConn)();
        await conn.run(`INSERT INTO employees (id, month_id, code, name, department_id, special_group, group_code_end_date,
         ngay_nghi_cuoi_thang_truoc, so_ngay_lam_cuoi_thang_truoc,
         workdays, overtime_hours, late_minutes, phep_nam, active, created_at, ${dayColList})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ${dayPlaceholders})`, id, mid, code, name, departmentId ?? '', specialGroup ?? '', groupCodeEndDate ?? '', ngayNghiCuoiThangTruoc ?? '', soNgayLamCuoiThangTruoc ?? 0, workdays ?? '', overtimeHours ?? '', lateMinutes ?? '', phepNam ?? '', createdAt, ...dayVals);
        await conn.close();
        return server_1.NextResponse.json({ ok: true }, { status: 201 });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('UNIQUE'))
            return server_1.NextResponse.json({ error: 'Mã nhân viên đã tồn tại' }, { status: 409 });
        console.error('[POST /api/employees]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
/* DELETE /api/employees?month=<monthId>  – Xóa toàn bộ nhân viên của tháng */
async function DELETE(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        const result = await conn.all(`SELECT COUNT(*) AS cnt FROM employees WHERE month_id = ?`, monthId);
        const cnt = Number(result[0].cnt);
        await conn.run(`DELETE FROM employees WHERE month_id = ?`, monthId);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, deleted: cnt });
    }
    catch (e) {
        console.error('[DELETE /api/employees]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
