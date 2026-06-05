import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/* ── Types ── */
interface Violation {
  code: string;       // mã nhân viên
  name: string;       // tên nhân viên
  deptName: string;   // phòng ban
  day: number;        // ngày vi phạm (0 = không cụ thể)
  detail: string;     // mô tả chi tiết vi phạm
  dailyBreakdown?: number[];  // [0..31]: số người nghỉ mỗi ngày (chỉ cho lp_balance summary)
  avgRest?: number;            // TB nghỉ/ngày (chỉ cho lp_balance summary)
  specialDays?: number[];      // ngày đặc biệt (NL, lễ) cần bỏ qua
}

interface CheckResult {
  id: string;
  label: string;
  description: string;
  status: 'ok' | 'warning' | 'error';
  violations: Violation[];
  violationCount: number;
  checkedCount: number;  // tổng số NV được kiểm tra
}

/* ── GET /api/distribution/validate?month=xxx ── */
export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? '';
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
  const idsParam = req.nextUrl.searchParams.get('ids');
  const filterIds = idsParam ? new Set(idsParam.split(',')) : null;

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth, month, year } = await loadMonthInfo(monthId);

    // Danh sách rule đang active — dùng để quyết định có chạy check hay không
    const activeRuleRows = await conn.all<{ paramKey: string }>(
      `SELECT param_key AS paramKey FROM alloc_rules WHERE month_id = ? AND active = TRUE`, monthId
    );
    const activeKeys = new Set(activeRuleRows.map(r => r.paramKey));

    // Load department map
    const deptRows = await conn.all<{ id: string; code: string; name: string }>(
      `SELECT id, code, name FROM departments WHERE month_id = ?`, monthId
    );
    const deptMap = new Map(deptRows.map(d => [d.id, d]));

    // Load distribution_results gộp theo NV
    const rawRows = await conn.all<{
      empId: string; empCode: string; empName: string; deptId: string;
      phepNam: number; ngayNghiCuoiThangTruoc: string; inputWorkdays: number;
      day: number; dayType: number; otHours: number; lateMins: number; shiftCode: string;
      checkIn: string; checkOut: string;
    }>(
      `SELECT dr.employee_id AS empId, e.code AS empCode, e.name AS empName,
              e.department_id AS deptId,
              COALESCE(TRY_CAST(e.phep_nam AS INTEGER), 0) AS phepNam,
              COALESCE(e.ngay_nghi_cuoi_thang_truoc, '') AS ngayNghiCuoiThangTruoc,
              COALESCE(TRY_CAST(e.workdays AS INTEGER), 0) AS inputWorkdays,
              dr.day, dr.day_type AS dayType,
              dr.ot_hours AS otHours, dr.late_mins AS lateMins,
              COALESCE(dr.shift_code, '') AS shiftCode,
              COALESCE(dr.check_in, '') AS checkIn, COALESCE(dr.check_out, '') AS checkOut
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ?
       ORDER BY e.code, dr.day`, monthId
    );

    // Group by empId
    type DayData = { day: number; dayType: number; otHours: number; lateMins: number; shiftCode: string; checkIn: string; checkOut: string };
    type EmpData = { empId: string; code: string; name: string; deptId: string; phepNam: number; inputWorkdays: number; ngayNghiCuoiThangTruoc: string; days: DayData[] };
    const empMap = new Map<string, EmpData>();
    for (const r of rawRows) {
      if (!empMap.has(r.empId)) {
        empMap.set(r.empId, { empId: r.empId, code: r.empCode, name: r.empName, deptId: r.deptId, phepNam: Number(r.phepNam) || 0, inputWorkdays: Number(r.inputWorkdays) || 0, ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '', days: [] });
      }
      empMap.get(r.empId)!.days.push({ day: Number(r.day), dayType: Number(r.dayType), otHours: Number(r.otHours), lateMins: Number(r.lateMins), shiftCode: r.shiftCode ?? '', checkIn: r.checkIn ?? '', checkOut: r.checkOut ?? '' });
    }
    const emps = Array.from(empMap.values());
    const totalEmps = emps.length;

    const results: CheckResult[] = [];

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 1: Khoảng cách ngày nghỉ liên tháng
       (ngay_nghi_cuoi_thang_truoc + đầu tháng không vượt maxConsecutiveDays)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkCrossMonth: CheckResult = {
      id: 'cross_month_consecutive',
      label: `Khoảng cách ngày nghỉ liên tháng (≤ ${params.maxConsecutiveDays} ngày)`,
      description: `Ngày làm cuối tháng trước + đầu tháng này không vượt ${params.maxConsecutiveDays} ngày liên tiếp`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    const calcConsecutiveDays = (ngayNghi: string): number => {
      if (!ngayNghi) return 0;
      const s = ngayNghi.trim().replace(/^["']|["']$/g, '');
      if (!s) return 0;
      let d: number, m: number, y: number;
      if (s.includes('/')) {
        const parts = s.split('/').map(Number);
        if (parts.length < 2) return 0;
        [d, m, y] = parts;
      } else {
        const parts = s.split('T')[0].split(' ')[0].split('-').map(Number);
        if (parts.length < 3) return 0;
        [y, m, d] = parts;
      }
      const lastDay = new Date(y, m, 0).getDate();
      return Math.max(0, lastDay - d);
    };
    const formatDDMMYYYY = (s: string): string => {
      if (!s) return '';
      const clean = s.trim().replace(/^["']|["']$/g, '');
      if (!clean) return '';
      let d: number, m: number, y: number;
      if (clean.includes('/')) {
        const parts = clean.split('/').map(Number);
        if (parts.length < 2) return s;
        [d, m, y] = parts;
      } else {
        const parts = clean.split('T')[0].split(' ')[0].split('-').map(Number);
        if (parts.length < 3) return s;
        [y, m, d] = parts;
      }
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    };
    for (const emp of emps) {
      const initRun = emp.ngayNghiCuoiThangTruoc ? calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc) : 0;
      if (initRun <= 0) continue;
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      let run = initRun;
      let runStart = 1;
      for (let d = 1; d <= daysInMonth; d++) {
        const dayData = emp.days.find(x => x.day === d);
        if (dayData?.dayType === 0) {
          run++;
          if (runStart < 0) runStart = d;
            if (run > params.maxConsecutiveDays) {
            const suggestedDay = params.maxConsecutiveDays - initRun < 1 ? 1 : params.maxConsecutiveDays - initRun;
            const suggestedDate = `${String(suggestedDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            checkCrossMonth.violations.push({
              code: emp.code, name: emp.name, deptName, day: runStart,
              detail: `${run} Giới hạn ngày làm liên tục từ cuối tháng trước (đã làm ${initRun} ngày cuối T3, nghỉ ${formatDDMMYYYY(emp.ngayNghiCuoiThangTruoc || '')}) — vượt giới hạn ${params.maxConsecutiveDays}` +
                ` — gợi ý: nên đổi X thành LP tại ngày ${suggestedDate}`,
            });
            break;
          }
        } else { run = 0; runStart = -1; break; }
      }
    }
    checkCrossMonth.violationCount = checkCrossMonth.violations.length;
    checkCrossMonth.status = checkCrossMonth.violationCount === 0 ? 'ok' : 'error';
    results.push(checkCrossMonth);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 2: Giới hạn ngày làm liên tục ≤ maxConsecutiveDays
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check1: CheckResult = {
      id: 'consecutive_days',
      label: `Giới hạn ngày làm liên tục (≤ ${params.maxConsecutiveDays} ngày)`,
      description: `Không quá ${params.maxConsecutiveDays} Giới hạn ngày làm liên tục`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      let run = 0; let runStart = 1;
      for (let d = 1; d <= daysInMonth; d++) {
        const dayData = emp.days.find(x => x.day === d);
        if (dayData?.dayType === 0) {
          if (run === 0) runStart = d;
          run++;
          if (run > params.maxConsecutiveDays) {
            const suggestedDay = runStart + params.maxConsecutiveDays;
            check1.violations.push({
              code: emp.code, name: emp.name, deptName, day: runStart,
              detail: `${run} ngày liên tục từ ngày ${runStart} (vượt giới hạn ${params.maxConsecutiveDays}) — gợi ý: nên đổi X thành LP tại ngày ${suggestedDay}`,
            });
            break;
          }
        } else { run = 0; }
      }
    }
    check1.violationCount = check1.violations.length;
    check1.status = check1.violationCount === 0 ? 'ok' : 'error';
    results.push(check1);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 2: PN chỉ từ ngày pnStartFromDay trở đi
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check2: CheckResult = {
      id: 'pn_start_day',
      label: `Vị trí phép năm (≥ ngày ${params.pnStartFromDay})`,
      description: activeKeys.has('pn_start_from_day')
        ? `PN chỉ được xếp từ ngày ${params.pnStartFromDay} trở đi`
        : 'Không áp dụng (rule đã tắt)',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    if (activeKeys.has('pn_start_from_day')) {
      for (const emp of emps) {
        const deptName = deptMap.get(emp.deptId)?.name ?? '—';
        for (const d of emp.days) {
          if (d.dayType === 2 && d.day < params.pnStartFromDay) {
            check2.violations.push({
              code: emp.code, name: emp.name, deptName, day: d.day,
              detail: `PN tại ngày ${d.day} (trước ngày ${params.pnStartFromDay})`,
            });
          }
        }
      }
    }
    check2.violationCount = check2.violations.length;
    check2.status = check2.violationCount === 0 ? 'ok' : 'warning';
    results.push(check2);

    /* check3 (pn_end_of_rest) đã bỏ — engine không đảm bảo PN đứng cuối LP trong step1 */
    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 4: Tăng ca tối đa maxOtPerDayHours h/ngày
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check4: CheckResult = {
      id: 'ot_max_per_day',
      label: `Tăng ca tối đa/ngày (≤ ${params.maxOtPerDayHours}h)`,
      description: `OT không quá ${params.maxOtPerDayHours}h mỗi ngày`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      for (const d of emp.days) {
        if (d.otHours > params.maxOtPerDayHours) {
          check4.violations.push({
            code: emp.code, name: emp.name, deptName, day: d.day,
            detail: `OT ngày ${d.day}: ${d.otHours}h (vượt ${params.maxOtPerDayHours}h)`,
          });
        }
      }
    }
    check4.violationCount = check4.violations.length;
    check4.status = check4.violationCount === 0 ? 'ok' : 'error';
    results.push(check4);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 5: OT chỉ từ ngày otStartFromDay
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check5: CheckResult = {
      id: 'ot_start_day',
      label: `Tăng ca từ ngày thứ mấy (≥ ngày ${params.otStartFromDay})`,
      description: `Tăng ca chỉ phân bổ từ ngày ${params.otStartFromDay}`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      for (const d of emp.days) {
        if (d.otHours > 0 && d.day < params.otStartFromDay) {
          check5.violations.push({
            code: emp.code, name: emp.name, deptName, day: d.day,
            detail: `OT ngày ${d.day} (trước ngày ${params.otStartFromDay})`,
          });
        }
      }
    }
    check5.violationCount = check5.violations.length;
    check5.status = check5.violationCount === 0 ? 'ok' : 'error';
    results.push(check5);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 6: Trễ tối đa maxLatePerDayMinutes ph/ngày
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check6: CheckResult = {
      id: 'late_max_per_day',
      label: `Đi trễ tối đa/ngày (≤ ${params.maxLatePerDayMinutes} phút)`,
      description: `Trễ không quá ${params.maxLatePerDayMinutes} phút mỗi ngày`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      for (const d of emp.days) {
        if (d.lateMins > params.maxLatePerDayMinutes) {
          check6.violations.push({
            code: emp.code, name: emp.name, deptName, day: d.day,
            detail: `Trễ ngày ${d.day}: ${d.lateMins}ph (vượt ${params.maxLatePerDayMinutes}ph)`,
          });
        }
      }
    }
    check6.violationCount = check6.violations.length;
    check6.status = check6.violationCount === 0 ? 'ok' : 'error';
    results.push(check6);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 7: Trễ chỉ từ ngày lateStartFromDay
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check7: CheckResult = {
      id: 'late_start_day',
      label: `Trễ từ ngày thứ mấy (≥ ngày ${params.lateStartFromDay})`,
      description: `Trễ chỉ phân bổ từ ngày ${params.lateStartFromDay}`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      for (const d of emp.days) {
        if (d.lateMins > 0 && d.day < params.lateStartFromDay) {
          check7.violations.push({
            code: emp.code, name: emp.name, deptName, day: d.day,
            detail: `Trễ ngày ${d.day} (trước ngày ${params.lateStartFromDay})`,
          });
        }
      }
    }
    check7.violationCount = check7.violations.length;
    check7.status = check7.violationCount === 0 ? 'ok' : 'error';
    results.push(check7);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check: Chia ca — ngày làm phải có shift_code
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkShift: CheckResult = {
      id: 'shift_assigned',
      label: 'Chia ca (100% ngày làm có ca)',
      description: 'Tất cả ngày làm (X) phải được gán ca (Ca 1 / Ca 2)',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      for (const d of emp.days) {
        if (d.day >= 1 && d.day <= daysInMonth && d.dayType === 0 && !d.shiftCode) {
          checkShift.violations.push({
            code: emp.code, name: emp.name, deptName, day: d.day,
            detail: `Ngày ${d.day}: ngày làm chưa được gán ca`,
          });
          break; // 1 vi phạm/NV là đủ
        }
      }
    }
    checkShift.violationCount = checkShift.violations.length;
    checkShift.status = checkShift.violationCount === 0 ? 'ok' : 'error';
    results.push(checkShift);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check: Cân bằng Ca1/Ca2 theo phòng mỗi ngày (chênh ≤ 1)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkShiftBalance: CheckResult = {
      id: 'shift_balance',
      label: 'Cân bằng ca trong phòng (chênh ≤ 1 NV)',
      description: 'Số NV Ca1 và Ca2 trong cùng phòng mỗi ngày chênh ≤ 1',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    const deptDayShift = new Map<string, Map<number, { c1: number; c2: number }>>();
    for (const emp of emps) {
      for (const d of emp.days) {
        if (d.dayType !== 0 || !d.shiftCode) continue;
        if (!deptDayShift.has(emp.deptId)) deptDayShift.set(emp.deptId, new Map());
        const dayMap = deptDayShift.get(emp.deptId)!;
        if (!dayMap.has(d.day)) dayMap.set(d.day, { c1: 0, c2: 0 });
        const stat = dayMap.get(d.day)!;
        if (d.shiftCode === 'C1') stat.c1++;
        else if (d.shiftCode === 'C2') stat.c2++;
      }
    }
    for (const [deptId, dayMap] of deptDayShift) {
      const deptName = deptMap.get(deptId)?.name ?? '—';
      // Dòng summary phòng nếu có vi phạm
      const deptViolDays: string[] = [];
      for (const [day, stat] of dayMap) {
        if (stat.c1 === 0 || stat.c2 === 0) continue;
        const diff = Math.abs(stat.c1 - stat.c2);
        if (diff > 1) deptViolDays.push(`Ngày ${day}: Ca1=${stat.c1}, Ca2=${stat.c2} (chênh ${diff})`);
      }
      if (deptViolDays.length > 0) {
        checkShiftBalance.violations.push({ code: '—', name: `📊 ${deptName}`, deptName, day: 0, detail: `${deptViolDays.length} ngày vi phạm` });
        for (const detail of deptViolDays) {
          checkShiftBalance.violations.push({ code: '—', name: deptName, deptName, day: 0, detail });
        }
      }
    }
    checkShiftBalance.violationCount = checkShiftBalance.violations.length;
    checkShiftBalance.status = checkShiftBalance.violationCount === 0 ? 'ok' : 'warning';
    results.push(checkShiftBalance);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check: Giờ vào/ra hợp lệ
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkTime: CheckResult = {
      id: 'check_time',
      label: 'Giờ vào/ra (checkIn < checkOut)',
      description: 'Ngày làm phải có giờ vào/ra hợp lệ (checkIn < checkOut)',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      for (const d of emp.days) {
        if (d.day >= 1 && d.day <= daysInMonth && d.dayType === 0) {
          if (!d.checkIn || !d.checkOut) {
            checkTime.violations.push({ code: emp.code, name: emp.name, deptName, day: d.day, detail: `Ngày ${d.day}: thiếu giờ vào/ra` });
            break;
          }
          if (toMins(d.checkIn) >= toMins(d.checkOut)) {
            checkTime.violations.push({ code: emp.code, name: emp.name, deptName, day: d.day, detail: `Ngày ${d.day}: giờ vào (${d.checkIn}) ≥ giờ ra (${d.checkOut})` });
            break;
          }
        }
      }
    }
    checkTime.violationCount = checkTime.violations.length;
    checkTime.status = checkTime.violationCount === 0 ? 'ok' : 'error';
    results.push(checkTime);
    const check8: CheckResult = {
      id: 'lp_balance',
      label: `Cân bằng ngày nghỉ trong phòng (chênh ≤ ±1 ngày)`,
      description: 'Số NV nghỉ mỗi ngày không chênh quá ±1 so với trung bình phòng',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    // Nhóm NV theo phòng ban (bỏ qua skipEqualRestDeptCodes)
    const skipCodes = new Set(params.skipEqualRestDeptCodes.map(c => c.toUpperCase()));
    const deptEmpsMap = new Map<string, string[]>();
    const empInfoMap = new Map<string, { code: string; name: string }>();
    for (const emp of emps) {
      empInfoMap.set(emp.empId, { code: emp.code, name: emp.name });
      const dept = deptMap.get(emp.deptId);
      if (!dept || skipCodes.has(dept.code.toUpperCase())) continue;
      if (!deptEmpsMap.has(emp.deptId)) deptEmpsMap.set(emp.deptId, []);
      deptEmpsMap.get(emp.deptId)!.push(emp.empId);
    }

    for (const [deptId, memberIds] of deptEmpsMap) {
      if (memberIds.length < 3) continue;
      const deptName = deptMap.get(deptId)?.name ?? '—';
      const totalMembers = memberIds.length;

      // Đếm số người nghỉ mỗi ngày
      const dailyRest: number[] = new Array(daysInMonth + 1).fill(0);
      for (const empId of memberIds) {
        const emp = emps.find(e => e.empId === empId);
        if (!emp) continue;
        for (const d of emp.days) {
          if (d.dayType !== 0) dailyRest[d.day]++;
        }
      }

      // Bỏ qua ngày đặc biệt (tất cả NV đều nghỉ — NL, lễ...)
      const specialDays = new Set<number>();
      for (let day = 1; day <= daysInMonth; day++) {
        if (dailyRest[day] >= totalMembers) specialDays.add(day);
      }

      const checkedDays = daysInMonth - specialDays.size;
      if (checkedDays === 0) continue;

      let totalRestDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        if (!specialDays.has(day)) totalRestDays += dailyRest[day];
      }
      const avg = totalRestDays / checkedDays;

      const violatingDays: { day: number; restCount: number; deviation: number }[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        if (specialDays.has(day)) continue;
        const deviation = dailyRest[day] - avg;
        if (deviation > 1 || deviation < -1) {
          violatingDays.push({ day, restCount: dailyRest[day], deviation });
        }
      }

      if (violatingDays.length > 0) {
        const specialNote = specialDays.size > 0 ? ` (bỏ qua ${specialDays.size} ngày đặc biệt)` : '';
        check8.violations.push({
          code: '—', name: `📊 ${deptName}`, deptName, day: 0,
          detail: `${memberIds.length} NV — TB ${avg.toFixed(1)} nghỉ/ngày — ${violatingDays.length} ngày vi phạm${specialNote}`,
          dailyBreakdown: dailyRest.slice(), avgRest: avg,
          specialDays: specialDays.size > 0 ? [...specialDays] : undefined,
        });
        for (const vd of violatingDays) {
          check8.violations.push({
            code: '—', name: deptName, deptName, day: vd.day,
            detail: `Ngày ${vd.day}: ${vd.restCount} người nghỉ (${vd.deviation > 0 ? '+' : ''}${vd.deviation.toFixed(1)} so với TB)`,
          });
        }
        // Thêm per-employee để filter "Vi phạm" hoạt động
        for (const empId of memberIds) {
          const info = empInfoMap.get(empId);
          if (info) {
            check8.violations.push({ code: info.code, name: info.name, deptName, day: 0 });
          }
        }
      }
    }
    check8.violationCount = check8.violations.length;
    check8.status = check8.violationCount === 0 ? 'ok' : 'warning';
    results.push(check8);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check: PN trong dữ liệu import (employees) từ ngày pnStartFromDay
       Đọc từ bảng employees.day_X (symbol gốc), không phải distribution_results
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const DAY_COLS = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`);
    const empImportRows = await conn.all<Record<string, string>>(
      `SELECT e.code, e.name, d.name AS deptName, ${DAY_COLS.map(c => `e.${c}`).join(', ')}
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ? AND e.active = TRUE`, monthId
    );
    const checkImportPN: CheckResult = {
      id: 'pn_start_day_import',
      label: `PN trong dữ liệu import (≥ ngày ${params.pnStartFromDay})`,
      description: `PN trong file import chỉ được xếp từ ngày ${params.pnStartFromDay} trở đi`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: empImportRows.length,
    };
    const PN_SYMBOLS = new Set(['PN', 'pn']);
    for (const r of empImportRows) {
      for (let d = 1; d < params.pnStartFromDay; d++) {
        const sym = (r[`day_${d}`] ?? '').trim();
        if (PN_SYMBOLS.has(sym)) {
          checkImportPN.violations.push({
            code: r.code, name: r.name, deptName: r.deptName ?? '—', day: d,
            detail: `PN tại ngày ${d} trong dữ liệu import (trước ngày ${params.pnStartFromDay})`,
          });
          break; // 1 vi phạm/NV là đủ
        }
      }
    }
    checkImportPN.violationCount = checkImportPN.violations.length;
    checkImportPN.status = checkImportPN.violationCount === 0 ? 'ok' : 'error';
    results.push(checkImportPN);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check QT7: OT tối thiểu/ngày (nếu có OT thì ≥ minOtPerDayMinutes)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkQt7: CheckResult = {
      id: 'ot_min_per_day',
      label: params.minOtPerDayMinutes > 0
        ? `Tăng ca tối thiểu/ngày (≥ ${params.minOtPerDayMinutes} phút)`
        : 'Tăng ca tối thiểu/ngày',
      description: params.minOtPerDayMinutes > 0
        ? `Nếu có OT thì phải ≥ ${params.minOtPerDayMinutes} phút/ngày`
        : 'Không áp dụng (min OT = 0)',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    if (params.minOtPerDayMinutes > 0) {
      const minOtH = params.minOtPerDayMinutes / 60;
      for (const emp of emps) {
        const deptName = deptMap.get(emp.deptId)?.name ?? '—';
        for (const d of emp.days) {
          if (d.otHours > 0 && d.otHours < minOtH) {
            checkQt7.violations.push({
              code: emp.code, name: emp.name, deptName, day: d.day,
              detail: `OT ngày ${d.day}: ${Math.round(d.otHours * 60)}ph (dưới tối thiểu ${params.minOtPerDayMinutes}ph)`,
            });
          }
        }
      }
    }
    checkQt7.violationCount = checkQt7.violations.length;
    checkQt7.status = checkQt7.violationCount === 0 ? 'ok' : 'error';
    results.push(checkQt7);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check QT8: OT cân bằng trong phòng ban (chênh ≤ maxOtBalanceDiffMinutes)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkQt8: CheckResult = {
      id: 'ot_balance',
      label: `OT cân bằng trong phòng (chênh ≤ ${params.maxOtBalanceDiffMinutes} phút)`,
      description: `Chênh lệch OT giữa NV cùng phòng ≤ ${params.maxOtBalanceDiffMinutes} phút/ngày`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    {
      const maxDiffH = params.maxOtBalanceDiffMinutes / 60;
      // Group NV theo phòng, mỗi ngày kiểm tra chênh lệch OT
      const deptDayOT = new Map<string, Map<number, number[]>>();
      for (const emp of emps) {
        for (const d of emp.days) {
          if (d.dayType !== 0 || d.otHours <= 0) continue;
          if (!deptDayOT.has(emp.deptId)) deptDayOT.set(emp.deptId, new Map());
          const dm = deptDayOT.get(emp.deptId)!;
          if (!dm.has(d.day)) dm.set(d.day, []);
          dm.get(d.day)!.push(d.otHours);
        }
      }
      for (const [deptId, dayMap] of deptDayOT) {
        const deptName = deptMap.get(deptId)?.name ?? '—';
        for (const [day, otList] of dayMap) {
          if (otList.length < 2) continue;
          const diff = Math.max(...otList) - Math.min(...otList);
          if (diff > maxDiffH) {
            checkQt8.violations.push({
              code: '—', name: deptName, deptName, day,
              detail: `Ngày ${day}: OT chênh ${Math.round(diff * 60)}ph (max ${params.maxOtBalanceDiffMinutes}ph) — [${otList.map(h => Math.round(h * 60) + 'ph').join(', ')}]`,
            });
          }
        }
      }
    }
    checkQt8.violationCount = checkQt8.violations.length;
    checkQt8.status = checkQt8.violationCount === 0 ? 'ok' : 'warning';
    results.push(checkQt8);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check QT9: OT tối đa giữa 2 ngày nghỉ ≤ maxOtBetweenRestHours
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkQt9: CheckResult = {
      id: 'ot_between_rest',
      label: `OT tối đa giữa 2 ngày nghỉ (≤ ${params.maxOtBetweenRestHours}h)`,
      description: `Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ ${params.maxOtBetweenRestHours}h`,
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      // Chia thành các "kỳ" giữa 2 ngày nghỉ
      let periodOT = 0; let periodStart = 1;
      for (let d = 1; d <= daysInMonth; d++) {
        const dayData = emp.days.find(x => x.day === d);
        if (!dayData || dayData.dayType !== 0) {
          // Ngày nghỉ → kết thúc kỳ
          if (periodOT > params.maxOtBetweenRestHours) {
            checkQt9.violations.push({
              code: emp.code, name: emp.name, deptName, day: periodStart,
              detail: `OT từ ngày ${periodStart}–${d - 1}: ${periodOT.toFixed(1)}h (vượt ${params.maxOtBetweenRestHours}h)`,
            });
          }
          periodOT = 0; periodStart = d + 1;
        } else {
          periodOT += dayData.otHours;
        }
      }
      // Kiểm tra kỳ cuối tháng
      if (periodOT > params.maxOtBetweenRestHours) {
        checkQt9.violations.push({
          code: emp.code, name: emp.name, deptName, day: periodStart,
          detail: `OT từ ngày ${periodStart}–${daysInMonth}: ${periodOT.toFixed(1)}h (vượt ${params.maxOtBetweenRestHours}h)`,
        });
      }
    }
    checkQt9.violationCount = checkQt9.violations.length;
    checkQt9.status = checkQt9.violationCount === 0 ? 'ok' : 'error';
    results.push(checkQt9);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check Cuối: Số ngày PN phải đúng bằng phepNam
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkPnCount: CheckResult = {
      id: 'pn_count',
      label: 'Số ngày phép năm (Phân bổ PN = Phép năm)',
      description: 'Số ngày PN trong tháng phải đúng bằng phép năm của NV',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      if (emp.phepNam === 0) continue;
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      const pnCount = emp.days.filter(d => d.day >= 1 && d.day <= daysInMonth && d.dayType === 2).length;
      if (pnCount !== emp.phepNam) {
        checkPnCount.violations.push({
          code: emp.code, name: emp.name, deptName, day: 0,
          detail: `Có ${pnCount} ngày PN, cần ${emp.phepNam}`,
        });
      }
    }
    checkPnCount.violationCount = checkPnCount.violations.length;
    checkPnCount.status = checkPnCount.violationCount === 0 ? 'ok' : 'error';
    results.push(checkPnCount);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check: Số ngày công phải đúng bằng workdays đầu vào
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkWorkdays: CheckResult = {
      id: 'workdays_count',
      label: 'Số ngày công (Phân bổ NC = Ngày công)',
      description: 'Số ngày X, PN, LL, H trong tháng phải đúng bằng ngày công đầu vào của NV',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const inputWd = Math.round(emp.inputWorkdays);
      if (inputWd === 0) continue;
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      const allocatedWd = emp.days.filter(d => d.day >= 1 && d.day <= 31 && [0, 2, 11, 13].includes(d.dayType)).length;
      if (allocatedWd !== inputWd) {
        const diff = allocatedWd - inputWd;
        const suggestion = diff > 0
          ? `giảm ${diff} ngày công: đổi X → LP hoặc chạy lại Bước 2`
          : `thiếu ${-diff} ngày công: đổi LP → X hoặc chạy lại Bước 2`;
        checkWorkdays.violations.push({
          code: emp.code, name: emp.name, deptName, day: 0,
          detail: `Phân bổ ${allocatedWd} ngày công, cần ${inputWd} (${suggestion})`,
        });
      }
    }
    checkWorkdays.violationCount = checkWorkdays.violations.length;
    checkWorkdays.status = checkWorkdays.violationCount === 0 ? 'ok' : 'error';
    results.push(checkWorkdays);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Summary
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    // Chỉ hiển thị 3 checks quan trọng về OT (trừ khi có filter cụ thể)
    const IMPORTANT_OT_CHECKS = new Set(['ot_min_per_day', 'ot_balance', 'ot_between_rest']);
    const filtered = filterIds 
      ? results.filter(r => filterIds.has(r.id)) 
      : results.filter(r => IMPORTANT_OT_CHECKS.has(r.id));
    
    const totalViolations = filtered.reduce((s, r) => s + r.violationCount, 0);
    const hasError = filtered.some(r => r.status === 'error');
    const hasWarning = filtered.some(r => r.status === 'warning');
    const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

    await conn.close();
    return NextResponse.json({
      monthId,
      totalEmps,
      totalViolations,
      overallStatus,
      checkedAt: new Date().toISOString(),
      results: filtered,
    });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
