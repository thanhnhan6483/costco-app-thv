"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * src/lib/workers/step1Worker.ts
 * Worker thread: tính arrangement cho 1 batch NV
 */
const worker_threads_1 = require("worker_threads");
const distributionEngine_ts_1 = require("../distributionEngine.ts");
const { emps, daysInMonth, month, year, params, accountingIds, monthId, now } = worker_threads_1.workerData;
const accountingSet = new Set(accountingIds);
const rows = [];
for (const emp of emps) {
    const arrangement = (0, distributionEngine_ts_1.step1_generateArrangement)(emp, daysInMonth, month, year, params, accountingSet.has(emp.departmentId ?? ''));
    for (let d = 0; d < daysInMonth; d++) {
        rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arrangement[d], now]);
    }
}
worker_threads_1.parentPort.postMessage(rows);
