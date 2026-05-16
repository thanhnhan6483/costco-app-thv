"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_COLS = void 0;
exports.loadParams = loadParams;
exports.loadShiftMap = loadShiftMap;
exports.getShiftEntry = getShiftEntry;
exports.loadSpecialDeptIds = loadSpecialDeptIds;
exports.getStatus = getStatus;
exports.markStepDone = markStepDone;
exports.loadMonthInfo = loadMonthInfo;
/**
 * stepHelpers.ts — Shared logic dùng chung cho tất cả step APIs
 */
const db_1 = require("@/lib/db");
exports.DAY_COLS = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`);
/** Load alloc_params từ DB */
async function loadParams(monthId) {
    const conn = await (0, db_1.getConn)();
    const rules = await conn.all(`SELECT param_key AS paramKey, param_value AS paramValue, specific_value AS specificValue
     FROM alloc_rules WHERE month_id = ? AND active = TRUE`, monthId);
    await conn.close();
    const m = Object.fromEntries(rules.map(r => [r.paramKey, r.paramValue]));
    const sv = Object.fromEntries(rules.map(r => [r.paramKey, r.specificValue ?? '']));
    const activeParamKeys = new Set(rules.map(r => r.paramKey));
    // Parse danh sách mã PB từ specific_value (ví dụ: "BGD,KD")
    const skipCodes = (sv['skip_equal_rest_dept_codes'] || 'BGD')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    return {
        maxConsecutiveDays: m['max_consecutive_days'] ?? 6,
        workdaysThreshold: m['workdays_algorithm_threshold'] ?? 27,
        pnStartFromDay: m['pn_start_from_day'] ?? 15,
        usePnPreferredPosition: activeParamKeys.has('pn_preferred_position'),
        maxOtPerDayHours: m['max_ot_per_day_hours'] ?? 4,
        otStartFromDay: m['ot_distribution_start_day'] ?? 15,
        maxLatePerDayMinutes: m['max_late_per_day_minutes'] ?? 14,
        lateStartFromDay: m['late_distribution_start_day'] ?? 15,
        specialGroupHourReduction: m['special_group_work_hour_reduction'] ?? 1,
        skipEqualRestDeptCodes: skipCodes,
    };
}
/** Load shifts map: deptId → {ca1, ca2}, key 'DEFAULT' = ca chung toàn công ty (department_id IS NULL) */
async function loadShiftMap(monthId) {
    const conn = await (0, db_1.getConn)();
    const rawShifts = await conn.all(`SELECT id, department_id AS departmentId, shift_type AS shiftType,
            window_start AS windowStart, clock_in AS clockIn,
            clock_out AS clockOut, window_end AS windowEnd
     FROM shifts WHERE month_id = ?`, monthId);
    await conn.close();
    const map = new Map();
    for (const s of rawShifts) {
        const key = s.departmentId ?? 'DEFAULT'; // NULL dept_id → ca chung
        if (!map.has(key))
            map.set(key, { ca1: null, ca2: null });
        const entry = map.get(key);
        const info = {
            departmentId: s.departmentId,
            shiftType: s.shiftType,
            windowStart: s.windowStart || s.clockIn,
            clockIn: s.clockIn,
            clockOut: s.clockOut,
            windowEnd: s.windowEnd || s.clockOut,
        };
        if (!s.shiftType || s.shiftType === 'Ca 1')
            entry.ca1 = info;
        else if (s.shiftType === 'Ca 2')
            entry.ca2 = info;
    }
    return map;
}
/** Tra cứu ca cho 1 dept, fallback về ca chung nếu không có ca riêng */
function getShiftEntry(shiftMap, deptId) {
    const defaultEntry = shiftMap.get('DEFAULT') ?? { ca1: null, ca2: null };
    if (!deptId)
        return defaultEntry;
    return shiftMap.get(deptId) ?? defaultEntry;
}
/** Load accounting dept IDs */
async function loadSpecialDeptIds(monthId) {
    const conn = await (0, db_1.getConn)();
    const depts = await conn.all(`SELECT id, code, name FROM departments WHERE month_id = ?`, monthId);
    await conn.close();
    const accountingIds = new Set(depts.filter(d => d.code === 'KT' || d.name.toLowerCase().includes('k\u1ebf to\u00e1n')).map(d => d.id));
    const bgdIds = new Set(depts.filter(d => d.code === 'BGD' || d.name.toLowerCase().includes('gi\u00e1m \u0111\u1ed1c')).map(d => d.id));
    return { accountingIds, bgdIds };
}
/** Get/upsert distribution_status */
async function getStatus(monthId) {
    const conn = await (0, db_1.getConn)();
    const rows = await conn.all(`SELECT * FROM distribution_status WHERE month_id = ?`, monthId);
    await conn.close();
    if (rows.length === 0)
        return {
            monthId, step1Done: false, step2Done: false, step3Done: false,
            step4Done: false, step5Done: false, step6Done: false,
        };
    const r = rows[0];
    return {
        monthId,
        step1Done: Boolean(r.step1_done), step2Done: Boolean(r.step2_done),
        step3Done: Boolean(r.step3_done), step4Done: Boolean(r.step4_done),
        step5Done: Boolean(r.step5_done), step6Done: Boolean(r.step6_done),
    };
}
async function markStepDone(monthId, step) {
    const conn = await (0, db_1.getConn)();
    const col = `step${step}_done`;
    const now = new Date().toISOString().slice(0, 19);
    // Upsert
    const existing = await conn.all(`SELECT COUNT(*) AS cnt FROM distribution_status WHERE month_id = ?`, monthId);
    if (Number(existing[0].cnt) === 0) {
        await conn.run(`INSERT INTO distribution_status (month_id, ${col}, updated_at) VALUES (?, TRUE, ?)`, monthId, now);
    }
    else {
        await conn.run(`UPDATE distribution_status SET ${col} = TRUE, updated_at = ? WHERE month_id = ?`, now, monthId);
    }
    await conn.close();
}
/** Load month info → daysInMonth, month, year */
async function loadMonthInfo(monthId) {
    const conn = await (0, db_1.getConn)();
    const rows = await conn.all(`SELECT from_date AS fromDate FROM months WHERE id = ?`, monthId);
    await conn.close();
    if (!rows.length)
        throw new Error('Không tìm thấy tháng: ' + monthId);
    const [, mStr, yStr] = rows[0].fromDate.split('/');
    const month = parseInt(mStr), year = parseInt(yStr);
    return { month, year, daysInMonth: new Date(year, month, 0).getDate() };
}
