"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const distributionEngine_1 = require("@/lib/distributionEngine");
exports.runtime = 'nodejs';
function nanOrNum(v) {
    const n = parseFloat(String(v ?? ''));
    return isNaN(n) ? null : n;
}
async function POST(req) {
    const conn = await (0, db_1.getConn)();
    try {
        const { monthId } = await req.json();
        if (!monthId)
            return server_1.NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
        /* 1. Load alloc params */
        const rawRules = await conn.all(`SELECT param_key AS paramKey, param_value AS paramValue FROM alloc_rules WHERE month_id = ?`, monthId);
        const ruleMap = Object.fromEntries(rawRules.map(r => [r.paramKey, r.paramValue]));
        const activeKeys = new Set(rawRules.map(r => r.paramKey));
        const params = {
            maxConsecutiveDays: ruleMap['max_consecutive_days'] ?? 6,
            workdaysThreshold: ruleMap['workdays_algorithm_threshold'] ?? 27,
            pnStartFromDay: ruleMap['pn_start_from_day'] ?? 15,
            usePnPreferredPosition: activeKeys.has('pn_preferred_position'),
            maxOtPerDayHours: ruleMap['max_ot_per_day_hours'] ?? 4,
            otStartFromDay: ruleMap['ot_distribution_start_day'] ?? 15,
            maxLatePerDayMinutes: ruleMap['max_late_per_day_minutes'] ?? 14,
            lateStartFromDay: ruleMap['late_distribution_start_day'] ?? 15,
            specialGroupHourReduction: ruleMap['special_group_work_hour_reduction'] ?? 1,
            skipEqualRestDeptCodes: [],
        };
        /* 2. Load month info */
        const months = await conn.all(`SELECT from_date AS fromDate, to_date AS toDate FROM months WHERE id = ?`, monthId);
        if (!months.length)
            return server_1.NextResponse.json({ error: 'Không tìm thấy tháng' }, { status: 404 });
        const [dStr, mStr, yStr] = months[0].fromDate.split('/');
        const monthNum = parseInt(mStr), yearNum = parseInt(yStr);
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        /* 3. Load shifts → map by departmentId */
        const rawShifts = await conn.all(`SELECT id, department_id AS departmentId, shift_type AS shiftType,
              window_start AS windowStart, clock_in AS clockIn,
              clock_out AS clockOut, window_end AS windowEnd
       FROM shifts WHERE month_id = ?`, monthId);
        // Group: deptId → { ca1, ca2 }
        const shiftMap = new Map();
        for (const s of rawShifts) {
            const key = s.departmentId ?? 'DEFAULT';
            if (!shiftMap.has(key))
                shiftMap.set(key, { ca1: null, ca2: null });
            const entry = shiftMap.get(key);
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
        /* 4. Load departments — find Accounting dept ids */
        const rawDepts = await conn.all(`SELECT id, code, name FROM departments WHERE month_id = ?`, monthId);
        const accountingIds = new Set(rawDepts.filter(d => d.code === 'KT' || d.name.toLowerCase().includes('k\u1ebf to\u00e1n')).map(d => d.id));
        /* 4b. Load special_groups → map code → work_hours */
        const rawGroups = await conn.all(`SELECT code, work_hours AS workHours FROM special_groups WHERE month_id = ?`, monthId);
        const specialGroupHours = new Map(rawGroups.map(g => [g.code.toUpperCase(), g.workHours]));
        /* 5. Load employees */
        const DAY_COLS = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`);
        const rawEmps = await conn.all(`SELECT id, code, name, department_id AS departmentId,
              special_group AS specialGroup, group_code_end_date AS groupCodeEndDate,
              ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              workdays, overtime_hours AS overtimeHours,
              late_minutes AS lateMinutes, phep_nam AS phepNam,
              ${DAY_COLS.join(', ')}
       FROM employees WHERE month_id = ? AND active = TRUE`, monthId);
        /* 6. Clear old results for this month */
        await conn.run(`DELETE FROM distribution_results WHERE month_id = ?`, monthId);
        /* 7. Process each employee */
        const now = new Date().toISOString().slice(0, 10);
        let totalProcessed = 0;
        const warnings = [];
        for (const emp of rawEmps) {
            const empInput = {
                id: emp.id, departmentId: emp.departmentId ?? '',
                specialGroup: emp.specialGroup ?? '',
                groupCodeEndDate: emp.groupCodeEndDate ?? '',
                ngayNghiCuoiThangTruoc: emp.ngayNghiCuoiThangTruoc ?? '',
                workdays: emp.workdays ?? '27',
                overtimeHours: emp.overtimeHours ?? '0',
                lateMinutes: emp.lateMinutes ?? '0',
                phepNam: emp.phepNam ?? '0',
                days: DAY_COLS.map(c => emp[c] ?? ''),
            };
            const deptId = emp.departmentId ?? '';
            const isAccounting = accountingIds.has(deptId);
            // groupWorkHours: lấy từ special_groups.work_hours theo mã nhóm của NV
            const groupCode = (emp.specialGroup ?? '').toUpperCase();
            const groupWorkHours = groupCode ? (specialGroupHours.get(groupCode) ?? null) : null;
            // Lấy shift theo dept
            const shiftEntry = shiftMap.get(deptId) ?? shiftMap.get('DEFAULT') ?? { ca1: null, ca2: null };
            const dayResults = (0, distributionEngine_1.processEmployee)(empInput, daysInMonth, monthNum, yearNum, params, shiftEntry.ca1, shiftEntry.ca2, isAccounting, groupWorkHours);
            // Kiểm tra ngày công
            const actualWork = dayResults.filter(d => d.dayType === 0 || d.dayType === 2).length;
            const expectedWork = parseFloat(emp.workdays) || 27;
            if (Math.abs(actualWork - expectedWork) > 0.5) {
                warnings.push(`${emp.code}: kỳ vọng ${expectedWork} công, thực tế ${actualWork}`);
            }
            // Ghi vào DB (batch insert)
            for (const dr of dayResults) {
                const rid = `${emp.id}_${monthId}_d${dr.day}`;
                await conn.run(`INSERT INTO distribution_results
             (id, month_id, employee_id, day, day_type, check_in, check_out,
              shift_code, ot_hours, late_mins, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`, rid, monthId, emp.id, dr.day, dr.dayType, dr.checkIn, dr.checkOut, dr.shiftCode, dr.otHours, dr.lateMins, now);
            }
            totalProcessed++;
        }
        await conn.close();
        return server_1.NextResponse.json({
            ok: true,
            monthId,
            daysInMonth,
            totalEmployees: totalProcessed,
            warnings: warnings.slice(0, 20), // tối đa 20 cảnh báo
            warningCount: warnings.length,
        });
    }
    catch (e) {
        console.error('[distribution/run]', e);
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
