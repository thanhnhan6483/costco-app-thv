import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadSpecialDeptIds, markStepDone, loadMonthInfo, loadSymbolMap, DAY_COLS } from '@/lib/stepHelpers';
import { EmployeeInput, calcConsecutiveDays } from '@/lib/distributionEngine';
import { parsePage, buildPagedResponse } from '@/lib/paginate';
import { Worker } from 'worker_threads';
import { cpus } from 'os';
import path from 'path';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 phút timeout cho local

function runWorker(workerData: unknown): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      path.join(process.cwd(), 'src/lib/workers/compiled/lib/workers/step1Worker.js'),
      { workerData }
    );
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', code => { if (code !== 0) reject(new Error(`Worker exit ${code}`)); });
  });
}

export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
  let conn;
  try {
    conn = await getConn();
    const params = await loadParams(monthId);
    const { month, year, daysInMonth } = await loadMonthInfo(monthId);
    const { accountingIds } = await loadSpecialDeptIds(monthId);
    const symbolMap = await loadSymbolMap(monthId);
    const now = new Date().toISOString().slice(0, 10);
    const t_start = Date.now();

    const emps = await conn.all<Record<string, string>>(
      `SELECT id, code, department_id AS departmentId, special_group AS specialGroup,
              group_code_end_date AS groupCodeEndDate, ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              workdays, overtime_hours AS overtimeHours, late_minutes AS lateMinutes, phep_nam AS phepNam,
              ${DAY_COLS.join(', ')} FROM employees WHERE month_id = ? AND active = TRUE`, monthId
    );

    await conn.run(`DELETE FROM distribution_results WHERE month_id = ?`, monthId);

    const empInputs = emps.map(emp => ({
      id: emp.id, departmentId: emp.departmentId ?? '',
      specialGroup: emp.specialGroup ?? '', groupCodeEndDate: emp.groupCodeEndDate ?? '',
      ngayNghiCuoiThangTruoc: emp.ngayNghiCuoiThangTruoc ?? '',
      workdays: emp.workdays ?? '27', overtimeHours: emp.overtimeHours ?? '0',
      lateMinutes: emp.lateMinutes ?? '0', phepNam: emp.phepNam ?? '0',
      days: DAY_COLS.map(c => emp[c] ?? ''),
    }));

    // Nhóm theo phòng trước khi chia chunk để dailyRest tracking trong worker chính xác
    const deptMap = new Map<string, typeof empInputs>();
    for (const emp of empInputs) {
      const d = emp.departmentId ?? 'none';
      if (!deptMap.has(d)) deptMap.set(d, []);
      deptMap.get(d)!.push(emp);
    }
    const deptGroups = Array.from(deptMap.values());

    const numWorkers = Math.min(8, Math.max(1, cpus().length - 1));
    const workerChunks: EmployeeInput[][] = Array.from({ length: numWorkers }, () => []);
    for (let i = 0; i < deptGroups.length; i++) {
      workerChunks[i % numWorkers].push(...deptGroups[i]);
    }
    const chunks = workerChunks.filter(c => c.length > 0);

    const workerResults = await Promise.all(chunks.map(chunk =>
      runWorker({ emps: chunk, daysInMonth, month, year, params,
        accountingIds: [...accountingIds], monthId, now, symbolMap })
    ));
    const allRows = workerResults.flat();
    console.log(`[step1] workers done: ${Date.now() - t_start}ms, rows: ${allRows.length}`);

    // ── Cân bằng LP nội bộ (trước khi INSERT) ──
    {
      const maxConsec = params.maxConsecutiveDays;
      type Row = [string, string, string, number, number, string];
      // Build emp → { deptId, days: Map<day, {idx, dt}> }
      const empDeptMap = new Map(empInputs.map(e => [e.id, e.departmentId ?? 'none']));
      const empData = new Map<string, { deptId: string; days: Map<number, { idx: number; dt: number }> }>();
      for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i] as Row;
        const empId = row[2];
        if (!empData.has(empId)) {
          empData.set(empId, { deptId: empDeptMap.get(empId) ?? 'none', days: new Map() });
        }
        empData.get(empId)!.days.set(row[3], { idx: i, dt: row[4] });
      }
      // Init run per employee
      const empInitRun = new Map<string, number>();
      for (const emp of empInputs) empInitRun.set(emp.id, calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc));
      // First PN per employee (lp_before_pn guard)
      const empFirstPn = new Map<string, number>();
      for (const [empId, data] of empData) {
        let fp = 0;
        for (let d = 1; d <= daysInMonth; d++) { if (data.days.get(d)?.dt === 2) { fp = d; break; } }
        if (fp > 0) empFirstPn.set(empId, fp);
      }
      // Group by dept
      const deptEmps = new Map<string, string[]>();
      for (const [empId, data] of empData) {
        const d = data.deptId; if (!deptEmps.has(d)) deptEmps.set(d, []);
        deptEmps.get(d)!.push(empId);
      }

      const canSwapToWork = (empId: string, day: number): boolean => {
        const days = empData.get(empId)?.days; if (!days) return false;
        let rBefore = 0, startDay = 1;
        for (let d = day - 1; d >= 1; d--) { if (days.get(d)?.dt === 0) rBefore++; else { startDay = d + 1; break; } }
        let rAfter = 0;
        for (let d = day + 1; d <= daysInMonth; d++) { if (days.get(d)?.dt === 0) rAfter++; else break; }
        const total = rBefore + 1 + rAfter;
        const init = startDay === 1 ? (empInitRun.get(empId) ?? 0) : 0;
        return (init + total) <= maxConsec;
      };
      const canSwapToRest = (empId: string, day: number): boolean => {
        const fp = empFirstPn.get(empId); return !fp || day < fp;
      };

      let totalFixed = 0;
      for (const [, members] of deptEmps) {
        if (members.length < 3) continue;
        const dailyRest = new Array(daysInMonth + 1).fill(0);
        for (const empId of members) {
          const days = empData.get(empId)!.days;
          for (let d = 1; d <= daysInMonth; d++) { const dt = days.get(d)?.dt; if (dt !== undefined && dt !== 0) dailyRest[d]++; }
        }
        const specialDays = new Set<number>();
        for (let d = 1; d <= daysInMonth; d++) { if (dailyRest[d] >= members.length) specialDays.add(d); }
        const checkedDays = daysInMonth - specialDays.size;
        if (checkedDays === 0) continue;
        let totalRest = 0;
        for (let d = 1; d <= daysInMonth; d++) { if (!specialDays.has(d)) totalRest += dailyRest[d]; }
        const avg = totalRest / checkedDays;

        for (let round = 0; round < 30; round++) {
          const overDays: number[] = [];
          const underDays: number[] = [];
          for (let d = 1; d <= daysInMonth; d++) {
            if (specialDays.has(d)) continue;
            if (dailyRest[d] > Math.floor(avg) + 1) overDays.push(d);
            if (dailyRest[d] < Math.ceil(avg) - 1) underDays.push(d);
          }
          if (overDays.length === 0 || underDays.length === 0) break;

          let anySwap = false;
          for (const overDay of overDays) {
            if (dailyRest[overDay] <= Math.floor(avg) + 1) continue;
            for (const underDay of underDays) {
              if (dailyRest[underDay] >= Math.ceil(avg) - 1) continue;
              const emp = members.find(e => {
                const days = empData.get(e)!.days;
                return days.get(overDay)?.dt === 1 && days.get(underDay)?.dt === 0
                  && canSwapToWork(e, overDay) && canSwapToRest(e, underDay);
              });
              if (!emp) continue;
              const days = empData.get(emp)!.days;
              days.get(overDay)!.dt = 0; allRows[days.get(overDay)!.idx][4] = 0;
              days.get(underDay)!.dt = 1; allRows[days.get(underDay)!.idx][4] = 1;
              dailyRest[overDay]--; dailyRest[underDay]++;
              totalFixed++; anySwap = true;
              break;
            }
            if (anySwap) break;
          }
          if (!anySwap) break;
        }
      }
      if (totalFixed > 0) console.log(`[step1] fixed ${totalFixed} LP balance violations inline`);
    }

    // ── Post-verify: kiểm tra X = workdays && PN = phepNam ──
    {
      const empLookup = new Map(empInputs.map(e => [e.id, e]));
      const empCounts = new Map<string, { xCount: number; pnCount: number }>();
      for (const row of allRows) {
        const empId = (row as any[])[2] as string;
        const dt = (row as any[])[4] as number;
        if (!empCounts.has(empId)) empCounts.set(empId, { xCount: 0, pnCount: 0 });
        const c = empCounts.get(empId)!;
        if (dt === 0) c.xCount++;
        else if (dt === 2) c.pnCount++;
      }
      let verifyErrors = 0;
      for (const [empId, counts] of empCounts) {
        const emp = empLookup.get(empId);
        if (!emp) continue;
        const wd = Math.round(Number(emp.workdays) || 27);
        const pn = Math.max(0, Math.round(Number(emp.phepNam) || 0));
        if (counts.xCount !== wd || counts.pnCount !== pn) {
          verifyErrors++;
          console.log(`[step1] VERIFY FAIL: emp=${empId} workdays=${wd} phepNam=${pn} → X=${counts.xCount} PN=${counts.pnCount}`);
        }
      }
      if (verifyErrors > 0) {
        console.log(`[step1] VERIFY: ${verifyErrors}/${empInputs.length} employees mismatch`);
      } else {
        console.log(`[step1] VERIFY: all ${empInputs.length} employees OK`);
      }
    }

    // Batch INSERT theo chunk 500 rows/lần trong 1 transaction
    const CHUNK = 2000;
    await conn.run('BEGIN TRANSACTION');
    try {
      for (let i = 0; i < allRows.length; i += CHUNK) {
        const chunk = allRows.slice(i, i + CHUNK);
        const placeholders = chunk.map(() => `(?,?,?,?,?,'','','',0,0,?)`).join(',');
        await conn.run(
          `INSERT INTO distribution_results (id,month_id,employee_id,day,day_type,check_in,check_out,shift_code,ot_hours,late_mins,created_at) VALUES ${placeholders}`,
          ...chunk.flat()
        );
      }
      await conn.run('COMMIT');
      console.log(`[step1] insert done: ${Date.now() - t_start}ms`);
    } catch (e) {
      await conn.run('ROLLBACK');
      throw e;
    }

    const processed = emps.length;
    await markStepDone(monthId, 2);
    return NextResponse.json({ ok: true, step: 2, processed });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    if (conn) try { await conn.close(); } catch { /* ignore */ }
  }
}

// GET — xem kết quả bước 1 (theo trang, nhóm theo NV)
export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const monthId = url.searchParams.get('month') ?? '';
  const { page, limit, offset } = parsePage(url);
  let conn;
  try {
    conn = await getConn();
    const [{ total }] = await conn.all<{ total: number }>(
      `SELECT COUNT(DISTINCT employee_id) AS total FROM distribution_results WHERE month_id = ?`, monthId
    );
    // Lấy danh sách employee_id của trang này
    const empIds = await conn.all<{ empId: string }>(
      `SELECT DISTINCT dr.employee_id AS empId
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ? ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset
    );
    if (empIds.length === 0) {
      return NextResponse.json(buildPagedResponse([], Number(total), page, limit));
    }
    const ids = empIds.map(r => r.empId);
    const placeholders = ids.map(() => '?').join(',');
    const rows = await conn.all(
      `SELECT e.code, e.name AS empName, d.name AS deptName,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              e.workdays, e.phep_nam AS phepNam,
              dr.day, dr.day_type
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id = ? AND dr.employee_id IN (${placeholders})
       ORDER BY e.code, dr.day`, monthId, ...ids
    );
     const map = new Map<string, { code: string; name: string; deptName: string; ngayNghiCuoiThangTruoc: string; workdays: string; phepNam: string; days: {day:number;dayType:number}[] }>();
    for (const r of rows as any[]) {
       if (!map.has(r.code)) map.set(r.code, { code: r.code, name: r.empName, deptName: r.deptName ?? '', ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '', workdays: r.workdays ?? '', phepNam: r.phepNam ?? '', days: [] });
      map.get(r.code)!.days.push({ day: Number(r.day), dayType: Number(r.day_type) });
    }
    return NextResponse.json(buildPagedResponse(Array.from(map.values()), Number(total), page, limit));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    if (conn) try { await conn.close(); } catch { /* ignore */ }
  }
}
