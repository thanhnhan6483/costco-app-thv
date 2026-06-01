"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * src/lib/workers/step1Worker.ts
 * Worker thread: tính arrangement cho 1 batch NV
 */
const worker_threads_1 = require("worker_threads");
const distributionEngine_1 = require("../distributionEngine");
const { emps, daysInMonth, month, year, params, accountingIds, monthId, now, algo, symbolMap } = worker_threads_1.workerData;
const accountingSet = new Set(accountingIds);
const rows = [];
for (const emp of emps) {
    const empInput = { ...emp, workdays: emp._normalizedWorkdays };
    const arrangement = (0, distributionEngine_1.step1_generateArrangement)(empInput, daysInMonth, month, year, params, accountingSet.has(emp.departmentId ?? ''), algo, symbolMap);
    for (let d = 0; d < daysInMonth; d++) {
        rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arrangement[d], now]);
    }
}
worker_threads_1.parentPort.postMessage(rows);
