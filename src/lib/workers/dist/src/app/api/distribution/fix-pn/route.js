"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const stepHelpers_1 = require("@/lib/stepHelpers");
const distributionEngine_1 = require("@/lib/distributionEngine");
exports.runtime = 'nodejs';
/**
 * POST /api/distribution/fix-pn
 * Body: { monthId }
 * Tìm các NV vi phạm quy tắc vị trí PN, chạy lại placePNAtEndOfRestPeriod
 * chỉ trên những NV đó, cập nhật distribution_results.
 */
async function POST(req) {
    const { monthId } = await req.json();
    if (!monthId)
        return server_1.NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
    const conn = await (0, db_1.getConn)();
    try {
        const params = await (0, stepHelpers_1.loadParams)(monthId);
        const { daysInMonth } = await (0, stepHelpers_1.loadMonthInfo)(monthId);
        // Load tất cả distribution_results gộp theo NV
        const rawRows = await conn.all(`SELECT dr.employee_id AS empId, e.code AS empCode, dr.day, dr.day_type AS dayType
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ?
       ORDER BY e.code, dr.day`, monthId);
        // Group by empId
        const empMap = new Map();
        for (const r of rawRows) {
            if (!empMap.has(r.empId))
                empMap.set(r.empId, { empId: r.empId, code: r.empCode, days: new Map() });
            empMap.get(r.empId).days.set(r.day, r.dayType);
        }
        // Kiểm tra vi phạm PN cho từng NV
        const toFix = [];
        for (const emp of empMap.values()) {
            const arr = Array.from({ length: daysInMonth }, (_, i) => emp.days.get(i + 1) ?? -1);
            const pnDays = arr.map((v, i) => v === 2 ? i + 1 : -1).filter(d => d > 0);
            if (pnDays.length === 0)
                continue;
            let violated = false;
            for (const pnDay of pnDays) {
                // Vi phạm: PN trước pnStartFromDay
                if (pnDay < params.pnStartFromDay) {
                    violated = true;
                    break;
                }
            }
            if (!violated)
                continue;
            // Xây arrangement: thay PN → LP để placePNAtEndOfRestPeriod có thể tái đặt
            const arrangement = arr.map(v => v === 2 ? 1 : (v < 0 ? 0 : v));
            toFix.push({ empId: emp.empId, code: emp.code, arrangement });
        }
        if (toFix.length === 0) {
            await conn.close();
            return server_1.NextResponse.json({ ok: true, fixed: 0, message: 'Không có vi phạm PN nào cần sửa' });
        }
        // Sửa từng NV
        let fixed = 0;
        for (const emp of toFix) {
            const phepNam = emp.arrangement.filter(v => v === 2).length || 1;
            // arrangement đã thay PN→LP ở trên, giờ đặt lại PN đúng vị trí
            const fixed_arr = (0, distributionEngine_1.placePNAtEndOfRestPeriod)(emp.arrangement, daysInMonth, params, phepNam);
            // Cập nhật DB chỉ những ngày thay đổi
            for (let i = 0; i < daysInMonth; i++) {
                const day = i + 1;
                const oldDT = empMap.get(emp.empId).days.get(day) ?? -1;
                const newDT = fixed_arr[i];
                if (newDT !== oldDT && oldDT >= 0) {
                    await conn.run(`UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`, newDT, monthId, emp.empId, day);
                }
            }
            fixed++;
        }
        await conn.close();
        return server_1.NextResponse.json({ ok: true, fixed, total: toFix.length });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
