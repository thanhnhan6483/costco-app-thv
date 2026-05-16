"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
/**
 * POST /api/distribution/invalidate-after
 * Body: { monthId, afterDisplayStep }
 *
 * Reset trạng thái "done" của tất cả bước CÓ displayStep > afterDisplayStep.
 *
 * Mapping display step → DB column:
 *   display 1 → step2_done
 *   display 2 → step1_done
 *   display 3 → step4_done
 *   display 4 → step5_done
 *   display 5 → step6_done
 */
// Thứ tự display step → tên cột trong distribution_status
const STEP_ORDER = [
    { displayNum: 1, col: 'step2_done' },
    { displayNum: 2, col: 'step1_done' },
    { displayNum: 3, col: 'step4_done' },
    { displayNum: 4, col: 'step5_done' },
    { displayNum: 5, col: 'step6_done' },
];
async function POST(req) {
    try {
        const { monthId, afterDisplayStep } = await req.json();
        if (!monthId)
            return server_1.NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
        // Lọc các bước cần reset (displayNum > afterDisplayStep)
        const colsToReset = STEP_ORDER
            .filter(s => s.displayNum > afterDisplayStep)
            .map(s => s.col);
        if (colsToReset.length === 0) {
            return server_1.NextResponse.json({ ok: true, reset: [] });
        }
        const conn = await (0, db_1.getConn)();
        // Kiểm tra bản ghi đã tồn tại chưa
        const exists = await conn.all(`SELECT COUNT(*) AS cnt FROM distribution_status WHERE month_id = ?`, monthId);
        if (Number(exists[0]?.cnt) > 0) {
            // SET từng cột = FALSE
            const setClauses = colsToReset.map(c => `${c} = FALSE`).join(', ');
            await conn.run(`UPDATE distribution_status SET ${setClauses}, updated_at = ? WHERE month_id = ?`, new Date().toISOString().slice(0, 19), monthId);
        }
        await conn.close();
        return server_1.NextResponse.json({ ok: true, reset: colsToReset });
    }
    catch (e) {
        console.error('[POST /api/distribution/invalidate-after]', e);
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
