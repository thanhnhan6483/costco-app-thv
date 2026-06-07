import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { markStepDone, DAY_COLS, loadMonthInfo, loadSymbolMap } from '@/lib/stepHelpers';
import { parsePage, buildPagedResponse } from '@/lib/paginate';
export const runtime = 'nodejs';

// GET — dữ liệu import theo trang
export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const monthId = url.searchParams.get('month') ?? '';
  const { page, limit, offset } = parsePage(url);
  const conn = await getConn();
  try {
    const [{ total }] = await conn.all<{ total: number }>(
      `SELECT COUNT(*) AS total FROM employees WHERE month_id = ? AND active = TRUE`, monthId
    );
    const empPage = await conn.all<Record<string, string>>(
      `SELECT e.id, e.code, e.name, d.name AS deptName,
              e.special_group AS specialGroup,
              e.group_code_end_date AS groupCodeEndDate,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              e.workdays, e.overtime_hours AS overtimeHours,
              e.late_minutes AS lateMinutes, e.phep_nam AS phepNam,
              ${DAY_COLS.map(c => `e.${c}`).join(', ')}
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ? AND e.active = TRUE
       ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset
    );

    const data = empPage.map(emp => ({
      id: emp.id, code: emp.code, name: emp.name,
      deptName: emp.deptName ?? '',
      specialGroup: emp.specialGroup ?? '',
      ngayNghiCuoiThangTruoc: emp.ngayNghiCuoiThangTruoc ?? '',
      workdays: emp.workdays,
      overtimeHours: emp.overtimeHours ? (Math.round(parseFloat(String(emp.overtimeHours).replace(',', '.')) * 100) / 100).toString() : '0',
      lateMinutes: emp.lateMinutes ? (Math.round(parseFloat(String(emp.lateMinutes).replace(',', '.')) * 100) / 100).toString() : '0',
      phepNam: emp.phepNam,
      days: DAY_COLS.map((c, i) => ({ day: i + 1, symbol: (emp[c] ?? '').trim() })),
    }));

    await conn.close();
    return NextResponse.json(buildPagedResponse(data, Number(total), page, limit));
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — kiểm tra dữ liệu đầu vào rồi đánh dấu step 1 done
export async function POST(req: NextRequest) {
  const { monthId } = await req.json();

  // Kiểm tra input_data_consistency trước khi cho phép xác nhận
  const symbolMap = await loadSymbolMap(monthId);
  const { daysInMonth } = await loadMonthInfo(monthId);
  const conn = await getConn();
  const empRows = await conn.all<Record<string, string>>(
    `SELECT e.code, e.name, d.name AS deptName,
            e.workdays, e.phep_nam,
            ${DAY_COLS.map(c => `e.${c}`).join(', ')}
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.month_id = ? AND e.active = TRUE`, monthId
  );
  await conn.close();

  const symToType = new Map(Object.entries(symbolMap));
  const violations: Array<{ code: string; name: string; deptName: string; day: number; detail: string }> = [];

  for (const r of empRows) {
    const workdaysVal = Math.round(Number(r.workdays) ?? 27);
    const phepNam = Math.max(0, Math.round(Number(r.phep_nam) ?? 0));
    const xVal = workdaysVal - phepNam;
    let freeSlots = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const raw = (r[`day_${i}`] ?? '').toString().trim();
      if (!raw) { freeSlots++; continue; }
      const dt = symToType.get(raw);
      if (dt !== undefined && dt >= 0 && dt <= 1) freeSlots++;
    }
    if (freeSlots >= workdaysVal) continue;
    violations.push({
      code: r.code, name: r.name, deptName: r.deptName ?? '—', day: 0,
      detail: `Thiếu ${workdaysVal - freeSlots} ô trống. Chỉ có ${freeSlots} ô trống, cần xếp ${workdaysVal} chổ (${xVal}X + ${phepNam}PN). Cần kiểm tra lại Ngày Công, Phép Năm hoặc nghỉ cố định (NP, Ô, TS,...) đang chiếm ô`,
    });
  }

  if (violations.length > 0) {
    return NextResponse.json({
      error: 'Dữ liệu đầu vào không hợp lệ',
      monthId,
      totalEmps: empRows.length,
      totalViolations: violations.length,
      overallStatus: 'error',
      checkedAt: new Date().toISOString(),
      results: [{
        id: 'input_data_consistency',
        label: 'Kiểm tra dữ liệu đầu vào — đủ ô trống cho X + PN không',
        description: 'Tổng ô trống (31 positions) phải ≥ workdays + PN; ngày trống trong tháng phải ≥ workdays.',
        status: 'error',
        violations,
        violationCount: violations.length,
        checkedCount: empRows.length,
      }],
    }, { status: 400 });
  }

  await markStepDone(monthId, 1);
  return NextResponse.json({ ok: true, step: 2 });
}
