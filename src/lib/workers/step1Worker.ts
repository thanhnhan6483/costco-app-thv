import { workerData, parentPort } from 'worker_threads';
import type { EmployeeInput, AllocParams } from '../distributionEngine';
import {
  calcEmployeeLP, calcDeptQuota, greedyAssignLP,
  checkLPGaps, buildArrangement, encodeInputArray,
  calcConsecutiveDays, placePNAtEndOfRestPeriod,
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

const deptGroups = new Map<string, EmployeeInput[]>();
for (const emp of emps) {
  const d = emp.departmentId ?? 'none';
  if (!deptGroups.has(d)) deptGroups.set(d, []);
  deptGroups.get(d)!.push(emp);
}

const mcd = params.maxConsecutiveDays ?? 6;

for (const [deptId, group] of deptGroups) {
  if (accountingSet.has(deptId) || skipDeptSet.has(deptId)) {
    for (const emp of group) {
      const isAcct = accountingSet.has(emp.departmentId ?? '');
      const arr = step1_generateArrangement(emp, daysInMonth, month, year, params, isAcct, symbolMap, undefined, undefined, paidDayTypes);
      for (let d = 0; d < daysInMonth; d++) {
        rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arr[d], now]);
      }
    }
    continue;
  }

  const empLPCounts: number[] = [];
  const empFixed: number[][] = [];
  const empPhepNam: number[] = [];
  let totalLP = 0;

  for (const emp of group) {
    const lp = calcEmployeeLP(emp, daysInMonth, params, paidDayTypes, symbolMap);
    const fa = encodeInputArray(emp.days, symbolMap, daysInMonth);
    const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));
    empLPCounts.push(lp);
    empFixed.push(fa);
    empPhepNam.push(phepNam);
    totalLP += lp;
  }

  const quota = calcDeptQuota(totalLP, daysInMonth);
  const dailyLP = new Array(daysInMonth + 1).fill(0);
  const allLPPositions: number[][] = [];

  for (let ei = 0; ei < group.length; ei++) {
    const emp = group[ei];
    const lpCount = empLPCounts[ei];
    const fa = empFixed[ei];
    const initialLastZeros = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);
    const firstOnePos = Math.min(initialLastZeros, Math.floor(daysInMonth * 0.1));

    const positions = greedyAssignLP(lpCount, fa, daysInMonth, initialLastZeros, firstOnePos, mcd, quota, dailyLP);
    allLPPositions.push(positions);
  }

  for (let iter = 0; iter < 3; iter++) {
    let changed = false;
    for (let d = 1; d <= daysInMonth; d++) {
      const overload = dailyLP[d] - quota[d];
      if (overload <= 0) continue;
      for (let m = 0; m < overload; m++) {
        let foundSrc = -1;
        for (let ei = 0; ei < group.length; ei++) {
          const pos = allLPPositions[ei];
          if (!pos.includes(d)) continue;
          const fa = empFixed[ei];
          const emp = group[ei];
          const initialLastZeros = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);
          const remaining = pos.filter(p => p !== d);
          if (!checkLPGaps(remaining, daysInMonth, initialLastZeros, mcd)) continue;
          let bestTarget = -1, bestScore = -Infinity;
          for (let t = 1; t <= daysInMonth; t++) {
            if (dailyLP[t] >= quota[t]) continue;
            if (t === daysInMonth) continue;
            if (fa[t - 1] !== 0) continue;
            const testPos = [...remaining, t].sort((a, b) => a - b);
            if (!checkLPGaps(testPos, daysInMonth, initialLastZeros, mcd)) continue;
            const score = quota[t] - dailyLP[t];
            if (score > bestScore) { bestScore = score; bestTarget = t; }
          }
          if (bestTarget !== -1) {
            allLPPositions[ei] = [...remaining, bestTarget];
            dailyLP[d]--;
            dailyLP[bestTarget]++;
            changed = true;
            foundSrc = ei;
            break;
          }
        }
        if (foundSrc === -1) break;
      }
    }
    if (!changed) break;
  }

  for (let ei = 0; ei < group.length; ei++) {
    const emp = group[ei];
    const fa = empFixed[ei];
    const positions = allLPPositions[ei];
    const phepNam = empPhepNam[ei];

    let arr = [...fa];
    for (const p of positions) arr[p - 1] = 1;

    if (phepNam > 0) {
      const pnArr = placePNAtEndOfRestPeriod(arr, daysInMonth, params, phepNam);
      for (let i = 0; i < daysInMonth; i++) arr[i] = pnArr[i];
    }

    for (let d = 0; d < daysInMonth; d++) {
      rows.push([`${emp.id}_${monthId}_d${d + 1}`, monthId, emp.id, d + 1, arr[d], now]);
    }
  }
}

parentPort!.postMessage(rows);
