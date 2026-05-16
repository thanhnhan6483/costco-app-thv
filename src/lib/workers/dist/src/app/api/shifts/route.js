"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
/**
 * GET  /api/shifts?month=<monthId>   – Ca làm việc theo tháng
 * POST /api/shifts                    – Tạo ca (body chứa monthId)
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function GET(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        const rows = await conn.all(`
      SELECT s.id, s.month_id AS monthId, s.name,
             s.department_id AS departmentId,
             d.name          AS departmentName,
             d.code          AS departmentCode,
             s.is_default    AS isDefault,
             s.shift_type    AS shiftType,
             s.window_start  AS windowStart,
             s.clock_in      AS clockIn,
             s.clock_out     AS clockOut,
             s.window_end    AS windowEnd,
             s.late_minutes  AS lateMinutes,
             s.ot_threshold  AS otThreshold,
             s.ot_calc       AS otCalc,
             s.note,
             s.created_at    AS createdAt
      FROM shifts s
      LEFT JOIN departments d ON d.id = s.department_id AND d.month_id = s.month_id
      WHERE s.month_id = ?
      ORDER BY s.name
    `, monthId);
        await conn.close();
        return server_1.NextResponse.json(rows);
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function POST(req) {
    try {
        const b = await req.json();
        const mid = b.monthId ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        await conn.run(`
      INSERT INTO shifts (id, month_id, name, department_id, is_default, shift_type,
        window_start, clock_in, clock_out, window_end,
        late_minutes, ot_threshold, ot_calc, note, created_at)
      VALUES (?,?,?,?,?,?, ?,?,?,?, ?,?,?,?,?)
    `, b.id, mid, b.name, b.departmentId ?? null, b.isDefault ?? false, b.shiftType ?? 'Ca 1', b.windowStart ?? '', b.clockIn, b.clockOut, b.windowEnd ?? '', b.lateMinutes ?? 0, b.otThreshold ?? 0, b.otCalc ?? 'Tính từ giờ ra (công)', b.note ?? '', b.createdAt);
        await conn.close();
        return server_1.NextResponse.json({ ok: true }, { status: 201 });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
