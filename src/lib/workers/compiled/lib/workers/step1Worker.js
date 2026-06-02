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
    const arrangement = (0, distributionEngine_1.step1_generateArrangement)(emp, daysInMonth, month, year, params, accountingSet.has(emp.departmentId ?? ''), algo, symbolMap);
    // Luôn tạo 31 rows (giống Python: 31 ô cho mọi tháng, kể cả tháng ngắn)
    for (let d = 0; d < 31; d++) {
        rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arrangement[d], now]);
    }
}
worker_threads_1.parentPort.postMessage(rows);
