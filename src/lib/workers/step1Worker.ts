import { workerData, parentPort } from 'worker_threads';
import type { EmployeeInput, AllocParams } from '../distributionEngine';
import {
  calcEmployeeLP, dayFirstAssignLP,
  encodeInputArray, calcConsecutiveDays, placePNAtEndOfRestPeriod,
  step1_generateArrangement,
} from '../distributionEngine';

interface WorkerInput {
  emps: EmployeeInput[];
  daysInMonth: number;
  month: number;
  year: number;
  params: AllocParams;
  accountingIds: string[];
  skipDeptIds: string[];
  monthId: string;
  now: string;
}

const { emps, daysInMonth, month, year, params, accountingIds, skipDeptIds, monthId, now, symbolMap, paidDayTypes: paidArr } =
  workerData as WorkerInput & { symbolMap?: Record<string, number>; paidDayTypes?: number[] };

const accountingSet = new Set(accountingIds);
const skipDeptSet = new Set(skipDeptIds);
const paidDayTypes = paidArr ? new Set(paidArr) : undefined;
const rows: unknown[][] = [];
const mcd = params.maxConsecutiveDays ?? 6;

const deptGroups = new Map<string, EmployeeInput[]>();
for (const emp of emps) {
  const d = emp.departmentId ?? 'none';
  if (!deptGroups.has(d)) deptGroups.set(d, []);
  deptGroups.get(d)!.push(emp);
}

for (const [deptId, group] of deptGroups) {
  if (accountingSet.has(deptId) || skipDeptSet.has(deptId)) {
    // Fallback cũ cho accounting / skip dept
    for (const emp of group) {
      const isAcct = accountingSet.has(emp.departmentId ?? '');
      const arr = step1_generateArrangement(emp, daysInMonth, month, year, params, isAcct, symbolMap, undefined, undefined, paidDayTypes);
      for (let d = 0; d < daysInMonth; d++) {
        rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arr[d], now]);
      }
    }
    continue;
  }

  // Phase 1: Thu thập per-emp data
  const lpCounts: number[] = [];
  const fixedArrays: number[][] = [];
  const initGaps: number[] = [];
  const empPhepNam: number[] = [];
  const fixedWorking = new Array(daysInMonth + 1).fill(0);
  let totalNonX = 0;

  for (const emp of group) {
    const workdaysVal = Math.round(parseFloat(emp.workdays) || 27);
    const lp = calcEmployeeLP(emp, daysInMonth, params, paidDayTypes, symbolMap);
    const fa = encodeInputArray(emp.days, symbolMap, daysInMonth);
    const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));
    const initGap = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);
    lpCounts.push(lp + phepNam);
    fixedArrays.push(fa);
    initGaps.push(initGap);
    empPhepNam.push(phepNam);
    totalNonX += workdaysVal;

    // Count immutable fixed values per day (> 2: TS, Ô, NL, P...)
    for (let d = 0; d < daysInMonth; d++) {
      if (fa[d] > 2) fixedWorking[d + 1]++;
    }
  }

  // Phase 2: Day-first assign LP (randomized, balance-aware)
  const { positions: allLPPositions } = dayFirstAssignLP(
    lpCounts, fixedArrays, initGaps, daysInMonth, mcd,
    fixedWorking, totalNonX,
  );

  // Phase 3: Build arrangement (LP → PN → push rows)
  for (let ei = 0; ei < group.length; ei++) {
    const emp = group[ei];
    const fa = fixedArrays[ei];
    const pos = allLPPositions[ei];
    const phepNam = empPhepNam[ei];

    const arr = [...fa];
    for (const p of pos) arr[p - 1] = 1;

    if (phepNam > 0) {
      const pnArr = placePNAtEndOfRestPeriod(arr, daysInMonth, phepNam);
      for (let i = 0; i < daysInMonth; i++) arr[i] = pnArr[i];
    }

    for (let d = 0; d < daysInMonth; d++) {
      rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arr[d], now]);
    }
  }
}

parentPort!.postMessage(rows);
