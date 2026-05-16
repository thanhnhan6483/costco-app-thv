"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const b = await req.json();
        const conn = await (0, db_1.getConn)();
        await conn.run(`
      UPDATE shifts SET
        name=?, department_id=?, is_default=?, shift_type=?,
        window_start=?, clock_in=?, clock_out=?, window_end=?,
        late_minutes=?, ot_threshold=?, ot_calc=?, note=?
      WHERE id=?
    `, b.name, b.departmentId ?? null, b.isDefault ?? false, b.shiftType ?? 'Ca 1', b.windowStart ?? '', b.clockIn, b.clockOut, b.windowEnd ?? '', b.lateMinutes ?? 0, b.otThreshold ?? 0, b.otCalc ?? 'Tính từ giờ ra (công)', b.note ?? '', id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function DELETE(_req, { params }) {
    try {
        const { id } = await params;
        const conn = await (0, db_1.getConn)();
        await conn.run(`DELETE FROM shifts WHERE id=?`, id);
        await conn.close();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
