import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadSpecialDeptIds, markStepDone, loadMonthInfo, DAY_COLS } from '@/lib/stepHelpers';
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
  const { monthId, algo = 'backtracking' } = await req.json();
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { month, year, daysInMonth } = await loadMonthInfo(monthId);
    const { accountingIds } = await loadSpecialDeptIds(monthId);
    const now = new Date().toISOString().slice(0, 10);
    const t_start = Date.now();

    // Load map deptId → code để tra cứu skipEqualRestDeptCodes
    const deptCodeRows = await conn.all<{ id: string; code: string }>(
      `SELECT id, code FROM departments WHERE month_id = ?`, monthId
    );
    const deptIdToCode = new Map(deptCodeRows.map(d => [d.id, d.code.toUpperCase()]));
    const skipCodes = new Set(params.skipEqualRestDeptCodes);

    const emps = await conn.all<Record<string, string>>(
      `SELECT id, code, department_id AS departmentId, special_group AS specialGroup,
              group_code_end_date AS groupCodeEndDate, ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              workdays, overtime_hours AS overtimeHours, late_minutes AS lateMinutes, phep_nam AS phepNam,
              ${DAY_COLS.join(', ')} FROM employees WHERE month_id = ? AND active = TRUE`, monthId
    );

    // ── Bước chuẩn hóa workdays theo phòng ban ──────────────────────────
    // Áp dụng cho mọi phòng ban TRỪ Ban Giám Đốc
    // Mục tiêu: LP count (= daysInMonth - workdays) chênh ≤ ±1 trong cùng phòng

    // 1. Nhóm workdays theo departmentId (bỏ qua BGD)
    const deptWorkdays = new Map<string, number[]>();
    for (const emp of emps) {
      const deptId = emp.departmentId ?? '';
      const deptCode = deptIdToCode.get(deptId) ?? '';
      if (!deptId || skipCodes.has(deptCode)) continue; // bỏ phòng trong skipCodes
      const wd = parseFloat(emp.workdays) || 27;
      if (!deptWorkdays.has(deptId)) deptWorkdays.set(deptId, []);
      deptWorkdays.get(deptId)!.push(wd);
    }

    // 2. Tính target workdays = median mỗi phòng
    const deptTarget = new Map<string, number>();
    for (const [deptId, wdList] of deptWorkdays) {
      const sorted = [...wdList].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
      deptTarget.set(deptId, Math.round(median));
    }

    // 3. Build map empId → clamped workdays (target ±1)
    const clampedWorkdays = new Map<string, number>();
    for (const emp of emps) {
      const deptId = emp.departmentId ?? '';
      const wd = parseFloat(emp.workdays) || 27;
      if (deptTarget.has(deptId)) {
        const target = deptTarget.get(deptId)!;
        clampedWorkdays.set(emp.id, Math.max(target - 1, Math.min(target + 1, wd)));
      } else {
        clampedWorkdays.set(emp.id, wd); // BGD hoặc không có phòng: giữ nguyên
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // Clear chỉ day_type — giữ các cột khác
    await conn.run(`DELETE FROM distribution_results WHERE month_id = ?`, monthId);

    // Chuẩn bị dữ liệu NV với workdays đã normalize
    const empInputs = emps.map(emp => ({
      id: emp.id, departmentId: emp.departmentId ?? '',
      specialGroup: emp.specialGroup ?? '', groupCodeEndDate: emp.groupCodeEndDate ?? '',
      ngayNghiCuoiThangTruoc: emp.ngayNghiCuoiThangTruoc ?? '',
      workdays: emp.workdays ?? '27', overtimeHours: emp.overtimeHours ?? '0',
      lateMinutes: emp.lateMinutes ?? '0', phepNam: emp.phepNam ?? '1',
      days: DAY_COLS.map(c => emp[c] ?? ''),
      _normalizedWorkdays: String(clampedWorkdays.get(emp.id) ?? emp.workdays ?? '27'),
    }));

    // Chia NV thành chunks, mỗi chunk chạy trên 1 worker thread
    const numWorkers = Math.min(8, Math.max(1, cpus().length - 1));
    const chunkSize = Math.ceil(empInputs.length / numWorkers);
    const chunks = Array.from({ length: numWorkers }, (_, i) =>
      empInputs.slice(i * chunkSize, (i + 1) * chunkSize)
    ).filter(c => c.length > 0);

    const workerResults = await Promise.all(chunks.map(chunk =>
      runWorker({ emps: chunk, daysInMonth, month, year, params,
        accountingIds: [...accountingIds], monthId, now, algo })
    ));
    const allRows = workerResults.flat();
    console.log(`[step1] workers done: ${Date.now() - t_start}ms, rows: ${allRows.length}`);

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
    await markStepDone(monthId, 1);
    await conn.close();
    return NextResponse.json({ ok: true, step: 1, processed });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET — xem kết quả bước 1 (theo trang, nhóm theo NV)
export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const monthId = url.searchParams.get('month') ?? '';
  const { page, limit, offset } = parsePage(url);
  const conn = await getConn();
  try {
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
      await conn.close();
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
    await conn.close();
    const map = new Map<string, { code: string; name: string; deptName: string; ngayNghiCuoiThangTruoc: string; days: {day:number;dayType:number}[] }>();
    for (const r of rows as any[]) {
      if (!map.has(r.code)) map.set(r.code, { code: r.code, name: r.empName, deptName: r.deptName ?? '', ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '', workdays: r.workdays ?? '', phepNam: r.phepNam ?? '', days: [] });
      map.get(r.code)!.days.push({ day: Number(r.day), dayType: Number(r.day_type) });
    }
    return NextResponse.json(buildPagedResponse(Array.from(map.values()), Number(total), page, limit));
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
