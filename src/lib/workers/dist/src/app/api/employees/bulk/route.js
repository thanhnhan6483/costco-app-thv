"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
/* PATCH /api/employees/bulk
   Body: { ids: string[], monthId?: string, departmentId?: string, specialGroup?: string, groupCodeEndDate?: string }
   Chỉ cập nhật các field được truyền vào (không null/undefined)
*/
async function PATCH(req) {
    try {
        const body = await req.json();
        const { ids, departmentId, maPb, specialGroup, groupCodeEndDate } = body;
        if (!ids || ids.length === 0)
            return server_1.NextResponse.json({ error: 'Không có dòng nào được chọn' }, { status: 400 });
        const conn = await (0, db_1.getConn)();
        const placeholders = ids.map(() => '?').join(', ');
        const setClauses = [];
        const values = [];
        if (departmentId !== undefined) {
            setClauses.push('department_id = ?');
            values.push(departmentId);
        }
        if (maPb !== undefined) {
            setClauses.push('ma_pb = ?');
            values.push(maPb);
        }
        if (specialGroup !== undefined) {
            setClauses.push('special_group = ?');
            values.push(specialGroup);
        }
        if (groupCodeEndDate !== undefined) {
            setClauses.push('group_code_end_date = ?');
            values.push(groupCodeEndDate);
        }
        if (setClauses.length === 0)
            return server_1.NextResponse.json({ error: 'Không có trường nào cần cập nhật' }, { status: 400 });
        await conn.run(`UPDATE employees SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`, ...values, ...ids);
        await conn.close();
        return server_1.NextResponse.json({ ok: true, updated: ids.length });
    }
    catch (e) {
        console.error('[PATCH /api/employees/bulk]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
