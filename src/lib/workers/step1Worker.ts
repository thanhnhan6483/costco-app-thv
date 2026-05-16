/**
 * src/lib/workers/step1Worker.ts
 * Worker thread: tính arrangement cho 1 batch NV
 */
import { workerData, parentPort } from 'worker_threads';
import { step1_generateArrangement } from '../distributionEngine';
import type { EmployeeInput, AllocParams } from '../distributionEngine';

interface WorkerInput {
  emps: (EmployeeInput & { _normalizedWorkdays: string })[];
  daysInMonth: number;
  month: number;
  year: number;
  params: AllocParams;
  accountingIds: string[];
  monthId: string;
  now: string;
  algo: 'backtracking' | 'greedy';
}

const { emps, daysInMonth, month, year, params, accountingIds, monthId, now, algo } =
  workerData as WorkerInput;

const accountingSet = new Set(accountingIds);
const rows: unknown[][] = [];

for (const emp of emps) {
  const empInput: EmployeeInput = { ...emp, workdays: emp._normalizedWorkdays };
  const arrangement = step1_generateArrangement(
    empInput, daysInMonth, month, year, params,
    accountingSet.has(emp.departmentId ?? ''),
    algo,
  );
  for (let d = 0; d < daysInMonth; d++) {
    rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arrangement[d], now]);
  }
}

parentPort!.postMessage(rows);
