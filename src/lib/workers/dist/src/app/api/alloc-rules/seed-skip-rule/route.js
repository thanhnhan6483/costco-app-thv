"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const route_1 = require("../route");
exports.runtime = 'nodejs';
/** Upsert rule "Phòng ban không phân bổ đồng đều LP" */
async function POST(req) {
    const { monthId } = await req.json().catch(() => ({}));
    const mid = monthId ?? db_1.DEFAULT_MONTH_ID;
    const conn = await (0, db_1.getConn)();
    try {
        // Xóa record cũ nếu có
        await conn.run(`DELETE FROM alloc_rules WHERE param_key = ? AND month_id = ?`, 'skip_equal_rest_dept_codes', mid);
        // Insert mới với text tiếng Việt đúng chuẩn (nằm trong source, không qua HTTP encoding)
        await conn.run(`INSERT INTO alloc_rules
         (id, month_id, group_code, group_name, name, param_key, param_value,
          default_param, specific_value, description, active, created_at)
       VALUES (?,?,?,?,?,?,NULL,?,?,?,TRUE,?)`, `rule_skip_equal_rest_${mid}`, mid, (0, route_1.toDb)('WORK_RULE'), (0, route_1.toDb)('Quy tắc làm việc'), (0, route_1.toDb)('Phòng ban không phân bổ đồng đều LP'), 'skip_equal_rest_dept_codes', (0, route_1.toDb)('BGD'), (0, route_1.toDb)('BGD'), (0, route_1.toDb)(''), // description để trống → không hiện subtitle trong cột Quy Tắc
        new Date().toISOString().slice(0, 10));
        await conn.close();
        return server_1.NextResponse.json({ ok: true, monthId: mid });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
