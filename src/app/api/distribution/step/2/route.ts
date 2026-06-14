import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadSpecialDeptIds, markStepDone, loadMonthInfo, loadSymbolMap, loadPaidDayTypes, DAY_COLS } from '@/lib/stepHelpers';
import { EmployeeInput } from '@/lib/distributionEngine';
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
    // Load deptId→code map để áp dụng skipEqualRestDeptCodes
    const deptCodeRows = await conn.all<{ id: string; code: string }>(
      `SELECT id, code FROM departments WHERE month_id = ?`, monthId
    );
    const deptCodeMap = new Map(deptCodeRows.map(d => [d.code.toUpperCase(), d.id]));
    const skipDeptIds = params.skipEqualRestDeptCodes
      .map((c: string) => deptCodeMap.get(c.toUpperCase()))
      .filter(Boolean) as string[];

    const symbolMap = await loadSymbolMap(monthId);
    const paidDayTypes = await loadPaidDayTypes(monthId);
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
        accountingIds: [...accountingIds], skipDeptIds, monthId, now,
        symbolMap, paidDayTypes: [...paidDayTypes] })
    ));
    const allRows = workerResults.flat();
    console.log(`[step1] workers done: ${Date.now() - t_start}ms, rows: ${allRows.length}`);

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
    const paidDayTypes = await loadPaidDayTypes(monthId);
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
    return NextResponse.json({
      ...buildPagedResponse(Array.from(map.values()), Number(total), page, limit),
      paidDayTypes: [...paidDayTypes],
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    if (conn) try { await conn.close(); } catch { /* ignore */ }
  }
}
