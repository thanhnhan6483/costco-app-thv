/**
 * src/lib/workers/step1Worker.ts
 * Worker thread: tính arrangement cho 1 batch NV
 */
import { workerData, parentPort } from 'worker_threads';
import { step1_generateArrangement, encodeInputArray } from '../distributionEngine';
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

// Nhóm NV theo phòng để theo dõi dailyRest cho cân bằng LP
const deptGroups = new Map<string, EmployeeInput[]>();
for (const emp of emps) {
  const d = emp.departmentId ?? 'none';
  if (!deptGroups.has(d)) deptGroups.set(d, []);
  deptGroups.get(d)!.push(emp);
}

for (const [, group] of deptGroups) {
  // Pre-compute tổng LP kỳ vọng của cả phòng để targetRest chính xác ngay từ NV đầu
  let totalExpectedLP = 0;
  for (const emp of group) {
    if (accountingSet.has(emp.departmentId ?? '')) continue;
    const workdays = parseFloat(emp.workdays) || 27;
    if (workdays === 0) continue;
    const inputArray = encodeInputArray(emp.days, symbolMap);
    const fa = inputArray.slice(0, 31);
    if (workdays >= params.workdaysThreshold)
      for (let i = 0; i < 31; i++) { if (fa[i] <= 1) fa[i] = 0; }
    const freeSlots = fa.filter(v => v === 0).length;
    const workdaysVal = Math.round(workdays);
    const paddedCount = Math.max(0, 31 - daysInMonth);
    const ZEROS = Math.max(0, workdaysVal + paddedCount);
    totalExpectedLP += Math.max(0, freeSlots - ZEROS);
  }
  const targetRest = totalExpectedLP > 0 ? totalExpectedLP / daysInMonth : 0;

  const dailyRest = new Array(31).fill(0);
  for (const emp of group) {
    const isAcct = accountingSet.has(emp.departmentId ?? '');
    const arrangement = step1_generateArrangement(
      emp, daysInMonth, month, year, params,
      isAcct, symbolMap,
      isAcct ? undefined : dailyRest,
      isAcct ? undefined : targetRest,
    );

    // Cập nhật dailyRest
    for (let d = 0; d < daysInMonth; d++) {
      if (arrangement[d] === 1) dailyRest[d]++;
    }

    for (let d = 0; d < 31; d++) {
      rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arrangement[d], now]);
    }
  }
}

parentPort!.postMessage(rows);
