"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * src/lib/workers/step1Worker.ts
 * Worker thread: tính arrangement cho 1 batch NV
 */
const worker_threads_1 = require("worker_threads");
const distributionEngine_1 = require("../distributionEngine");
const { emps, daysInMonth, month, year, params, accountingIds, skipDeptIds, monthId, now, symbolMap, paidDayTypes: paidArr } = worker_threads_1.workerData;
const accountingSet = new Set(accountingIds);
const skipDeptSet = new Set(skipDeptIds);
const paidDayTypes = paidArr ? new Set(paidArr) : undefined;
const rows = [];
// Nhóm NV theo phòng để theo dõi dailyRest cho cân bằng LP
const deptGroups = new Map();
for (const emp of emps) {
    const d = emp.departmentId ?? 'none';
    if (!deptGroups.has(d))
        deptGroups.set(d, []);
    deptGroups.get(d).push(emp);
}
for (const [, group] of deptGroups) {
    const deptId = group[0]?.departmentId ?? '';
    const shouldSkip = accountingSet.has(deptId) || skipDeptSet.has(deptId);
    // Pre-compute tổng LP kỳ vọng của cả phòng để targetRest chính xác ngay từ NV đầu
    let totalExpectedLP = 0;
    for (const emp of group) {
        if (accountingSet.has(emp.departmentId ?? ''))
            continue;
        const workdays = parseFloat(emp.workdays);
        let workdaysVal = isNaN(workdays) ? 27 : workdays;
        if (workdaysVal === 0)
            continue;
        const inputArray = (0, distributionEngine_1.encodeInputArray)(emp.days, symbolMap, daysInMonth);
        const fa = inputArray.slice(0, daysInMonth);
        if (workdays >= params.workdaysThreshold)
            for (let i = 0; i < daysInMonth; i++) {
                if (fa[i] <= 1)
                    fa[i] = 0;
            }
        const freeSlots = fa.filter(v => v === 0).length;
        workdaysVal = Math.round(workdays);
        const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));
        const preExistingPaidDays = paidDayTypes?.size
            ? fa.filter(v => v !== 0 && paidDayTypes.has(v)).length
            : 0;
        const remainingWorkdays = Math.max(0, workdaysVal - preExistingPaidDays - phepNam);
        const ZEROS = Math.max(0, remainingWorkdays);
        totalExpectedLP += Math.max(0, freeSlots - ZEROS - phepNam);
    }
    const targetRest = totalExpectedLP > 0 ? totalExpectedLP / daysInMonth : 0;
    const dailyRest = shouldSkip ? undefined : new Array(daysInMonth).fill(0);
    for (const emp of group) {
        const isAcct = accountingSet.has(emp.departmentId ?? '');
        const arrangement = (0, distributionEngine_1.step1_generateArrangement)(emp, daysInMonth, month, year, params, isAcct, symbolMap, isAcct || shouldSkip ? undefined : dailyRest, isAcct || shouldSkip ? undefined : targetRest, paidDayTypes);
        // Cập nhật dailyRest
        if (dailyRest) {
            for (let d = 0; d < daysInMonth; d++) {
                if (arrangement[d] === 1 || arrangement[d] === 2)
                    dailyRest[d]++;
            }
        }
        for (let d = 0; d < daysInMonth; d++) {
            rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arrangement[d], now]);
        }
    }
}
worker_threads_1.parentPort.postMessage(rows);
