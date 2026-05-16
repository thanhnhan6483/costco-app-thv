"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const stepHelpers_1 = require("@/lib/stepHelpers");
exports.runtime = 'nodejs';
// GET — bảng editable: workdays, phep_nam, day_1..31
async function GET(req) {
    const monthId = new URL(req.url).searchParams.get('month') ?? '';
    const conn = await (0, db_1.getConn)();
    try {
        const rows = await conn.all(`SELECT e.id, e.code, e.name, d.name AS deptName,
              e.workdays, e.overtime_hours AS overtimeHours,
              e.late_minutes AS lateMinutes, e.phep_nam AS phepNam,
              ${stepHelpers_1.DAY_COLS.map(c => `e.${c}`).join(', ')}
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ? AND e.active = TRUE
       ORDER BY e.code LIMIT 100`, monthId);
        await conn.close();
        return server_1.NextResponse.json(rows.map(r => ({
            id: r.id, code: r.code, name: r.name, deptName: r.deptName ?? '',
            workdays: r.workdays ?? '', overtimeHours: r.overtimeHours ?? '',
            lateMinutes: r.lateMinutes ?? '', phepNam: r.phepNam ?? '',
            days: stepHelpers_1.DAY_COLS.map(c => r[c] ?? ''),
        })));
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
// POST — lưu chỉnh sửa: [{id, workdays, phepNam, days[]}]
async function POST(req) {
    const { monthId, edits } = await req.json();
    if (!monthId || !edits?.length)
        return server_1.NextResponse.json({ ok: true, saved: 0 });
    const conn = await (0, db_1.getConn)();
    try {
        for (const edit of edits) {
            const setClauses = [];
            const vals = [];
            if (edit.workdays !== undefined) {
                setClauses.push('workdays=?');
                vals.push(edit.workdays);
            }
            if (edit.phepNam !== undefined) {
                setClauses.push('phep_nam=?');
                vals.push(edit.phepNam);
            }
            if (edit.overtimeHours !== undefined) {
                setClauses.push('overtime_hours=?');
                vals.push(edit.overtimeHours);
            }
            if (edit.lateMinutes !== undefined) {
                setClauses.push('late_minutes=?');
                vals.push(edit.lateMinutes);
            }
            if (edit.days?.length) {
                edit.days.forEach((v, i) => { setClauses.push(`day_${i + 1}=?`); vals.push(v); });
            }
            if (setClauses.length === 0)
                continue;
            vals.push(edit.id);
            await conn.run(`UPDATE employees SET ${setClauses.join(',')} WHERE id=?`, ...vals);
        }
        await (0, stepHelpers_1.markStepDone)(monthId, 3);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, saved: edits.length });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
