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
      day: number; dayType: number; otHours: number; lateMins: number;
    }>(
      `SELECT dr.employee_id AS empId, e.code AS empCode, e.name AS empName,
              e.department_id AS deptId,
              dr.day, dr.day_type AS dayType,
              dr.ot_hours AS otHours, dr.late_mins AS lateMins
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ?
       ORDER BY e.code, dr.day`, monthId
    );

    // Group by empId
    type DayData = { day: number; dayType: number; otHours: number; lateMins: number };
    type EmpData = { empId: string; code: string; name: string; deptId: string; days: DayData[] };
    const empMap = new Map<string, EmpData>();
    for (const r of rawRows) {
      if (!empMap.has(r.empId)) {
        empMap.set(r.empId, { empId: r.empId, code: r.empCode, name: r.empName, deptId: r.deptId, days: [] });
      }
      empMap.get(r.empId)!.days.push({ day: r.day, dayType: r.dayType, otHours: Number(r.otHours), lateMins: Number(r.lateMins) });
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
      label: 'Vị trí phép năm (ngày)',
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
       Check 3: PN ở cuối kỳ nghỉ (PN nên đứng sau LP)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check3: CheckResult = {
      id: 'pn_end_of_rest',
      label: 'PN cuối kỳ nghỉ',
      description: activeKeys.has('pn_start_from_day')
        ? 'PN phải đứng sau ít nhất 1 ngày LP liên tiếp (cuối kỳ nghỉ)'
        : 'Không áp dụng (rule đã tắt)',
      status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
    };
    if (activeKeys.has('pn_start_from_day')) {
      for (const emp of emps) {
        const deptName = deptMap.get(emp.deptId)?.name ?? '—';
        const dayArr = Array.from({ length: daysInMonth + 1 }, (_, i) => {
          const d = emp.days.find(x => x.day === i);
          return d?.dayType ?? -1;
        });
        const pnDay = emp.days.find(d => d.dayType === 2)?.day;
        if (pnDay && pnDay >= params.pnStartFromDay) {
          const prevDay = pnDay - 1;
          if (prevDay >= 1 && dayArr[prevDay] !== 1) {
            check3.violations.push({
              code: emp.code, name: emp.name, deptName, day: pnDay,
              detail: `PN ngày ${pnDay}: ngày trước (${prevDay}) không phải LP (code=${dayArr[prevDay]})`,
            });
          }
        }
      }
    }
    check3.violationCount = check3.violations.length;
    check3.status = check3.violationCount === 0 ? 'ok' : 'warning';
    results.push(check3);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Check 4: OT tối đa maxOtPerDayHours h/ngày
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const check4: CheckResult = {
      id: 'ot_max_per_day',
      label: 'OT tối đa/ngày',
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
      label: 'OT từ ngày thứ mấy',
      description: `OT chỉ phân bổ từ ngày ${params.otStartFromDay}`,
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
       Check 8: Cân bằng ngày nghỉ LP trong phòng ban (chênh ≤ 1)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
      if (maxLP - minLP > 1) {
        // Tìm các NV có LP bất thường
        for (const m of members) {
          if (m.lpCount === maxLP || m.lpCount === minLP) {
            check8.violations.push({
              code: m.code, name: m.name, deptName, day: 0,
              detail: `${deptName}: LP=${m.lpCount} ngày (phòng có LP từ ${minLP}→${maxLP}, chênh ${maxLP - minLP})`,
            });
          }
        }
      }
    }
    check8.violationCount = check8.violations.length;
    check8.status = check8.violationCount === 0 ? 'ok' : 'warning';
    results.push(check8);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Summary
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    const totalViolations = results.reduce((s, r) => s + r.violationCount, 0);
    const hasError   = results.some(r => r.status === 'error');
    const hasWarning = results.some(r => r.status === 'warning');
    const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

    await conn.close();
    return NextResponse.json({
      monthId,
      totalEmps,
      totalViolations,
      overallStatus,
      checkedAt: new Date().toISOString(),
      results,
    });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
