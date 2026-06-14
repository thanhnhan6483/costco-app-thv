"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const distributionEngine_1 = require("../distributionEngine");
const { emps, daysInMonth, month, year, params, accountingIds, skipDeptIds, monthId, now, symbolMap, paidDayTypes: paidArr } = worker_threads_1.workerData;
const accountingSet = new Set(accountingIds);
const skipDeptSet = new Set(skipDeptIds);
const paidDayTypes = paidArr ? new Set(paidArr) : undefined;
const rows = [];
const mcd = params.maxConsecutiveDays ?? 6;
const deptGroups = new Map();
for (const emp of emps) {
    const d = emp.departmentId ?? 'none';
    if (!deptGroups.has(d))
        deptGroups.set(d, []);
    deptGroups.get(d).push(emp);
}
for (const [deptId, group] of deptGroups) {
    if (accountingSet.has(deptId) || skipDeptSet.has(deptId)) {
        // Fallback cũ cho accounting / skip dept
        for (const emp of group) {
            const isAcct = accountingSet.has(emp.departmentId ?? '');
            const arr = (0, distributionEngine_1.step1_generateArrangement)(emp, daysInMonth, month, year, params, isAcct, symbolMap, undefined, undefined, paidDayTypes);
            for (let d = 0; d < daysInMonth; d++) {
                rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arr[d], now]);
            }
        }
        continue;
    }
    // Phase 1: Thu thập per-emp data
    const lpCounts = [];
    const fixedArrays = [];
    const initGaps = [];
    const empPhepNam = [];
    const fixedWorking = new Array(daysInMonth + 1).fill(0);
    let totalNonX = 0;
    for (const emp of group) {
        const workdaysVal = Math.round(parseFloat(emp.workdays) || 27);
        const lp = (0, distributionEngine_1.calcEmployeeLP)(emp, daysInMonth, params, paidDayTypes, symbolMap);
        const fa = (0, distributionEngine_1.encodeInputArray)(emp.days, symbolMap, daysInMonth);
        const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));
        const initGap = (0, distributionEngine_1.calcConsecutiveDays)(emp.ngayNghiCuoiThangTruoc);
        lpCounts.push(lp);
        fixedArrays.push(fa);
        initGaps.push(initGap);
        empPhepNam.push(phepNam);
        totalNonX += workdaysVal;
        // Count immutable fixed values per day (> 2: TS, Ô, NL, P...)
        for (let d = 0; d < daysInMonth; d++) {
            if (fa[d] > 2)
                fixedWorking[d + 1]++;
        }
    }
    // Phase 2: Day-first assign LP (randomized, PN-aware, balance-aware)
    const { positions: allLPPositions } = (0, distributionEngine_1.dayFirstAssignLP)(lpCounts, fixedArrays, initGaps, daysInMonth, mcd, fixedWorking, totalNonX, empPhepNam, params.pnStartFromDay ?? 15);
    // Phase 3: Build arrangement (LP → PN → push rows)
    for (let ei = 0; ei < group.length; ei++) {
        const emp = group[ei];
        const fa = fixedArrays[ei];
        const pos = allLPPositions[ei];
        const phepNam = empPhepNam[ei];
        const arr = [...fa];
        for (const p of pos)
            arr[p - 1] = 1;
        if (phepNam > 0) {
            const pnArr = (0, distributionEngine_1.placePNAtEndOfRestPeriod)(arr, daysInMonth, params, phepNam);
            for (let i = 0; i < daysInMonth; i++)
                arr[i] = pnArr[i];
        }
        for (let d = 0; d < daysInMonth; d++) {
            rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arr[d], now]);
        }
    }
}
worker_threads_1.parentPort.postMessage(rows);
