import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { markStepDone, DAY_COLS, loadMonthInfo, loadSymbolMap, loadParams, loadSpecialDeptIds } from '@/lib/stepHelpers';
import { calcConsecutiveDays } from '@/lib/distributionEngine';
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
              sg.name AS specialGroupName,
              e.group_code_end_date AS groupCodeEndDate,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              e.workdays, e.overtime_hours AS overtimeHours,
              e.late_minutes AS lateMinutes, e.phep_nam AS phepNam,
              ${DAY_COLS.map(c => `e.${c}`).join(', ')}
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN special_groups sg ON UPPER(sg.code) = UPPER(e.special_group) AND sg.month_id = e.month_id AND e.special_group <> ''
       WHERE e.month_id = ? AND e.active = TRUE
       ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset
    );

    const data = empPage.map(emp => ({
      id: emp.id, code: emp.code, name: emp.name,
      deptName: emp.deptName ?? '',
      specialGroup: emp.specialGroup ?? '',
      specialGroupName: emp.specialGroupName || emp.specialGroup || '',
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
            e.department_id, e.workdays, e.phep_nam,
            e.ngay_nghi_cuoi_thang_truoc,
            ${DAY_COLS.map(c => `e.${c}`).join(', ')}
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.month_id = ? AND e.active = TRUE`, monthId
  );
  await conn.close();

  const params = await loadParams(monthId);
  const { accountingIds } = await loadSpecialDeptIds(monthId);

  const formatDDMMYYYY = (s: string): string => {
    const clean = s.trim().replace(/^["']|["']$/g, '');
    if (!clean) return '';
    const parts = clean.includes('/') ? clean.split('/') : clean.split('T')[0].split(' ')[0].split('-');
    const [d, m, y] = parts.map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  };
  const parseDateObj = (s: string): { d: number; m: number; y: number } | null => {
    if (!s) return null;
    const clean = s.trim().replace(/^["']|["']$/g, '');
    if (!clean) return null;
    let d: number, m: number, y: number;
    if (clean.includes('/')) {
      const parts = clean.split('/').map(Number);
      if (parts.length < 2) return null;
      [d, m, y] = parts;
    } else {
      const parts = clean.split('T')[0].split(' ')[0].split('-').map(Number);
      if (parts.length < 3) return null;
      [y, m, d] = parts;
    }
    return { d, m, y };
  };

  const symToType = new Map(Object.entries(symbolMap));
  const inputViolations: Array<{ code: string; name: string; deptName: string; day: number; detail: string }> = [];

  const THRESHOLD = params.workdaysThreshold;
  for (const r of empRows) {
    const workdaysVal = Math.round(Number(r.workdays) ?? 27);
    const phepNam = Math.max(0, Math.round(Number(r.phep_nam) ?? 0));
    const needed = workdaysVal + phepNam;
    const isFullTime = workdaysVal >= THRESHOLD;
    let freeSlots = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const raw = (r[`day_${i}`] ?? '').toString().trim();
      if (!raw) { freeSlots++; continue; }
      const dt = symToType.get(raw);
      if (dt === 0) freeSlots++;
      else if (dt === 1 && isFullTime) freeSlots++;
    }
    if (freeSlots >= needed) continue;
    const shortage = needed - freeSlots;
    inputViolations.push({
      code: r.code, name: r.name, deptName: r.deptName ?? '—', day: 0,
      detail: `Thiếu ${shortage} ô trống. Chỉ có ${freeSlots} ô trống, cần xếp ${needed} chổ (${workdaysVal}X + ${phepNam}PN). Cần kiểm tra lại Ngày Công, Phép Năm hoặc nghỉ cố định (NP, Ô, TS,...) đang chiếm ô`,
    });
  }

  const checkLastLeaveViolations: Array<{ code: string; name: string; deptName: string; day: number; detail: string }> = [];
  for (const r of empRows) {
    const ngayNghiRaw = (r.ngay_nghi_cuoi_thang_truoc ?? '').trim();
    if (!ngayNghiRaw) continue;
    const initRun = calcConsecutiveDays(ngayNghiRaw);
    if (initRun <= params.maxConsecutiveDays) continue;
    checkLastLeaveViolations.push({
      code: r.code, name: r.name, deptName: r.deptName ?? '—', day: 0,
      detail: `${formatDDMMYYYY(ngayNghiRaw)} → sau ${params.maxConsecutiveDays} ngày LV cần nghỉ (còn trong tháng) — cập nhật ngày nghỉ cuối cùng thực tế`,
    });
  }

  const checkAcctViolations: Array<{ code: string; name: string; deptName: string; day: number; detail: string }> = [];
  for (const r of empRows) {
    const deptId = (r.department_id ?? '').trim();
    if (!deptId || !accountingIds.has(deptId)) continue;
    const ngayNghiRaw = (r.ngay_nghi_cuoi_thang_truoc ?? '').trim();
    if (!ngayNghiRaw) continue;
    const parsed = parseDateObj(ngayNghiRaw);
    if (!parsed) continue;
    const { d, m, y } = parsed;
    const lastDay = new Date(y, m, 0).getDate();
    for (let checkDay = d + 1; checkDay <= lastDay; checkDay++) {
      const dow = new Date(y, m - 1, checkDay).getDay();
      if (dow === 0 || dow === 6) {
        checkAcctViolations.push({
          code: r.code, name: r.name, deptName: r.deptName ?? '—', day: 0,
          detail: `NGHỈ THÁNG TRƯỚC (${formatDDMMYYYY(ngayNghiRaw)}) — còn T7/CN ngày ${checkDay}/${String(m).padStart(2, '0')} sau đó, cập nhật ngày cuối cùng thực tế`,
        });
        break;
      }
    }
  }

  const checkResults = [
    {
      id: 'input_data_consistency',
      label: 'Kiểm tra dữ liệu đầu vào — đủ ô trống cho X + PN không',
      description: 'Tổng ô trống (31 positions) phải ≥ workdays + PN; ngày trống trong tháng phải ≥ workdays.',
      status: inputViolations.length === 0 ? 'ok' : 'error',
      violations: inputViolations,
      violationCount: inputViolations.length,
      checkedCount: empRows.length,
    },
    {
      id: 'last_leave_day_import',
      label: `Ngày nghỉ tháng trước chưa phải ngày cuối cùng (cách cuối tháng >${params.maxConsecutiveDays} ngày)`,
      description: `Sau ${params.maxConsecutiveDays} ngày làm việc tiếp theo vẫn còn 1 ngày nghỉ trong tháng → nhập chưa đúng ngày nghỉ cuối cùng thực tế`,
      status: checkLastLeaveViolations.length === 0 ? 'ok' : 'error',
      violations: checkLastLeaveViolations,
      violationCount: checkLastLeaveViolations.length,
      checkedCount: empRows.length,
    },
    {
      id: 'accounting_ngay_nghi_cuoi_thang_truoc',
      label: 'Bộ phận kế toán ngày nghỉ cuối tháng không phải ngày T7/CN trong tháng',
      description: 'Nhân viên kế toán: ngày nghỉ cuối tháng trước phải sau T7/CN cuối cùng của tháng đó (không để còn T7/CN sau ngày nhập)',
      status: checkAcctViolations.length === 0 ? 'ok' : 'error',
      violations: checkAcctViolations,
      violationCount: checkAcctViolations.length,
      checkedCount: empRows.length,
    },
  ];

  const anyViolations = checkResults.some(r => r.violationCount > 0);

  if (anyViolations) {
    await markStepDone(monthId, 1);
    return NextResponse.json({
      ok: true, step: 2,
      overallStatus: 'warning',
      totalEmps: empRows.length,
      totalViolations: checkResults.reduce((s, r) => s + r.violationCount, 0),
      checkedAt: new Date().toISOString(),
      results: checkResults,
    });
  }

  await markStepDone(monthId, 1);
  return NextResponse.json({ ok: true, step: 2 });
}
