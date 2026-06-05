/**
 * src/lib/workers/step1Worker.ts
 * Worker thread: tính arrangement cho 1 batch NV
 */
import { workerData, parentPort } from 'worker_threads';
import { step1_generateArrangement } from '../distributionEngine';
import type { EmployeeInput, AllocParams } from '../distributionEngine';

interface WorkerInput {
  emps: EmployeeInput[];
  daysInMonth: number;
  month: number;
  year: number;
  params: AllocParams;
  accountingIds: string[];
  monthId: string;
  now: string;
}

const { emps, daysInMonth, month, year, params, accountingIds, monthId, now, symbolMap } =
  workerData as WorkerInput & { symbolMap?: Record<string, number> };

const accountingSet = new Set(accountingIds);
const rows: unknown[][] = [];

for (const emp of emps) {
  const arrangement = step1_generateArrangement(
    emp, daysInMonth, month, year, params,
    accountingSet.has(emp.departmentId ?? ''),
    symbolMap,
  );
  // Luôn tạo 31 rows (giống Python: 31 ô cho mọi tháng, kể cả tháng ngắn)
  for (let d = 0; d < 31; d++) {
    rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arrangement[d], now]);
  }
}

parentPort!.postMessage(rows);
