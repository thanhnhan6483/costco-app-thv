import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadSpecialDeptIds, markStepDone, loadMonthInfo, DAY_COLS } from '@/lib/stepHelpers';
import { step1_generateArrangement, EmployeeInput } from '@/lib/distributionEngine';
import { parsePage, buildPagedResponse } from '@/lib/paginate';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { month, year, daysInMonth } = await loadMonthInfo(monthId);
    const { accountingIds } = await loadSpecialDeptIds(monthId);
    const now = new Date().toISOString().slice(0, 10);

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

    let processed = 0;
    for (const emp of emps) {
      // Dùng workdays đã chuẩn hóa theo phòng ban
      const normalizedWorkdays = String(clampedWorkdays.get(emp.id) ?? emp.workdays ?? '27');
      const empInput: EmployeeInput = {
        id: emp.id, departmentId: emp.departmentId ?? '',
        specialGroup: emp.specialGroup ?? '', groupCodeEndDate: emp.groupCodeEndDate ?? '',
        ngayNghiCuoiThangTruoc: emp.ngayNghiCuoiThangTruoc ?? '',
        workdays: normalizedWorkdays, overtimeHours: emp.overtimeHours ?? '0',
        lateMinutes: emp.lateMinutes ?? '0', phepNam: emp.phepNam ?? '1',
        days: DAY_COLS.map(c => emp[c] ?? ''),
      };
      const arrangement = step1_generateArrangement(
        empInput, daysInMonth, month, year, params,
        accountingIds.has(emp.departmentId ?? '')
      );
      // Insert rows với chỉ day_type (check_in/out/shift trống)
      for (let d = 0; d < daysInMonth; d++) {
        const rid = `${emp.id}_${monthId}_d${d + 1}`;
        await conn.run(
          `INSERT INTO distribution_results (id,month_id,employee_id,day,day_type,check_in,check_out,shift_code,ot_hours,late_mins,created_at)
           VALUES (?,?,?,?,?,'','','',0,0,?)`,
          rid, monthId, emp.id, d + 1, arrangement[d], now
        );
      }
      processed++;
    }
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
              e.workdays,
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
      if (!map.has(r.code)) map.set(r.code, { code: r.code, name: r.empName, deptName: r.deptName ?? '', ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '', workdays: r.workdays ?? '', days: [] });
      map.get(r.code)!.days.push({ day: r.day, dayType: r.day_type });
    }
    return NextResponse.json(buildPagedResponse(Array.from(map.values()), Number(total), page, limit));
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
