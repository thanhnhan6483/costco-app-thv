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
    const { daysInMonth } = await loadMonthInfo(monthId);

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
      phepNam: number;
      day: number; dayType: number; otHours: number; lateMins: number; shiftCode: string;
      checkIn: string; checkOut: string;
    }>(
      `SELECT dr.employee_id AS empId, e.code AS empCode, e.name AS empName,
              e.department_id AS deptId,
              COALESCE(CAST(e.phep_nam AS INTEGER), 0) AS phepNam,
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
    type EmpData = { empId: string; code: string; name: string; deptId: string; phepNam: number; days: DayData[] };
    const empMap = new Map<string, EmpData>();
    for (const r of rawRows) {
      if (!empMap.has(r.empId)) {
        empMap.set(r.empId, { empId: r.empId, code: r.empCode, name: r.empName, deptId: r.deptId, phepNam: Number(r.phepNam) || 0, days: [] });
      }
      empMap.get(r.empId)!.days.push({ day: Number(r.day), dayType: Number(r.dayType), otHours: Number(r.otHours), lateMins: Number(r.lateMins), shiftCode: r.shiftCode ?? '', checkIn: r.checkIn ?? '', checkOut: r.checkOut ?? '' });
    }
    const emps = Array.from(empMap.values());
    const totalEmps = emps.length;

    const results: CheckResult[] = [];

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 1: Ngày làm liên tiếp ≤ maxConsecutiveDays
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check1: CheckResult = {
      id: 'consecutive_days',
      label: 'Ngày làm liên tiếp',
      description: `Không quá ${params.maxConsecutiveDays} ngày làm liên tiếp`,
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
            check1.violations.push({
              code: emp.code, name: emp.name, deptName, day: runStart,
              detail: `${run} ngày làm liên tiếp từ ngày ${runStart} (vượt giới hạn ${params.maxConsecutiveDays})`,
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
      label: 'Vị trí phép năm',
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
    check2.status = check2.violationCount === 0 ? 'ok' : 'error';
    results.push(check2);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 2b: Số ngày PN phải đúng bằng phepNam
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const checkPnCount: CheckResult = {
      id: 'pn_count',
      label: 'Số ngày phép năm',
      description: 'Số ngày PN trong tháng phải đúng bằng phép năm của NV',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      if (emp.phepNam === 0) continue;
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      const pnCount = emp.days.filter(d => d.dayType === 2).length;
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

    /* check3 (pn_end_of_rest) đã bỏ — engine không đảm bảo PN đứng cuối LP trong step1 */

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 4: Tăng ca tối đa maxOtPerDayHours h/ngày
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check4: CheckResult = {
      id: 'ot_max_per_day',
      label: 'Tăng ca tối đa/ngày',
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
      label: 'Tăng ca từ ngày thứ mấy',
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
      label: 'Đi trễ tối đa/ngày',
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
      label: 'Trễ từ ngày thứ mấy',
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
      label: 'Chia ca',
      description: 'Tất cả ngày làm (X) phải được gán ca (Ca 1 / Ca 2)',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      for (const d of emp.days) {
        if (d.dayType === 0 && !d.shiftCode) {
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
      label: 'Cân bằng ca trong phòng',
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
      label: 'Giờ vào/ra',
      description: 'Ngày làm phải có giờ vào/ra hợp lệ (checkIn < checkOut)',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    for (const emp of emps) {
      const deptName = deptMap.get(emp.deptId)?.name ?? '—';
      for (const d of emp.days) {
        if (d.dayType === 0) {
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
      label: 'Cân bằng ngày nghỉ trong phòng',
      description: 'Số ngày LP giữa NV cùng phòng ban không chênh lệch quá 1',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    // Nhóm NV theo phòng ban (bỏ qua skipEqualRestDeptCodes)
    const skipCodes = new Set(params.skipEqualRestDeptCodes.map(c => c.toUpperCase()));
    const deptEmps = new Map<string, { code: string; name: string; lpCount: number }[]>();
    for (const emp of emps) {
      const dept = deptMap.get(emp.deptId);
      if (!dept || skipCodes.has(dept.code.toUpperCase())) continue;
      const lpCount = emp.days.filter(d => d.dayType === 1).length;
      if (!deptEmps.has(emp.deptId)) deptEmps.set(emp.deptId, []);
      deptEmps.get(emp.deptId)!.push({ code: emp.code, name: emp.name, lpCount });
    }
    for (const [deptId, members] of deptEmps) {
      if (members.length < 2) continue;
      const deptName = deptMap.get(deptId)?.name ?? '—';
      const lpCounts = members.map(m => m.lpCount);
      const minLP = Math.min(...lpCounts);
      const maxLP = Math.max(...lpCounts);
      if (maxLP - minLP > params.maxDayOffDifference) {
        // Dòng summary cho phòng
        check8.violations.push({
          code: '—', name: `📊 ${deptName}`, deptName, day: 0,
          detail: `Min=${minLP} | Max=${maxLP} | Chênh=${maxLP - minLP} | ${members.length} NV`,
        });
        // Chi tiết từng NV lệch
        for (const m of members) {
          if (m.lpCount !== minLP && m.lpCount !== maxLP) continue;
          check8.violations.push({
            code: m.code, name: m.name, deptName, day: 0,
            detail: `LP = ${m.lpCount} ngày ${m.lpCount === maxLP ? '⬆ nhiều nhất' : '⬇ ít nhất'}`,
          });
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
      label: 'PN trong dữ liệu import',
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
       Summary
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const filtered = filterIds ? results.filter(r => filterIds.has(r.id)) : results;
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
