/**
 * stepHelpers.ts — Shared logic dùng chung cho tất cả step APIs
 */
import { getConn } from '@/lib/db';
import { AllocParams, ShiftInfo, DEFAULT_SYMBOL_MAP } from './distributionEngine';

export const DAY_COLS = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`);

export interface RawShift {
  id: string; departmentId: string | null; shiftType: string;
  windowStart: string; clockIn: string; clockOut: string; windowEnd: string;
}

/** Load alloc_params từ DB */
export async function loadParams(monthId: string): Promise<AllocParams> {
  const conn = await getConn();
  const rules = await conn.all<{ paramKey: string; paramValue: number | null; specificValue: string | null }>(
    `SELECT param_key AS paramKey, param_value AS paramValue, specific_value AS specificValue
     FROM alloc_rules WHERE month_id = ? AND active = TRUE`, monthId
  );
  await conn.close();
  const m = Object.fromEntries(rules.map(r => [r.paramKey, r.paramValue]));
  const sv = Object.fromEntries(rules.map(r => [r.paramKey, r.specificValue ?? '']));
  const activeParamKeys = new Set(rules.map(r => r.paramKey));

  // Parse danh sách mã PB từ specific_value (ví dụ: "BGD,KD")
  const skipCodes = (sv['skip_equal_rest_dept_codes'] || 'BGD')
    .split(',')
    .map((s: string) => s.trim().toUpperCase())
    .filter(Boolean);

  return {
    maxConsecutiveDays:        m['max_consecutive_days']          ?? 6,
    workdaysThreshold:         27, // hardcode như Python gốc
    pnStartFromDay:            m['pn_start_from_day']             ?? 15,
    maxOtPerDayHours:          m['max_ot_per_day_hours']          ?? 4,
    minOtPerDayMinutes:        m['min_ot_per_day_minutes']        ?? 60,
    otStartFromDay:            m['ot_distribution_start_day']     ?? 15,
    maxOtBetweenRestHours:     m['max_ot_between_rest_hours']     ?? 12,
    maxOtBalanceDiffMinutes:   m['max_ot_balance_diff_minutes']   ?? 30,
    maxLatePerDayMinutes:      m['max_late_per_day_minutes']      ?? 9,
    lateStartFromDay:          m['late_distribution_start_day']   ?? 15,
    specialGroupHourReduction: m['special_group_work_hour_reduction'] ?? 1,
    skipEqualRestDeptCodes:    skipCodes,
    maxDayOffDifference:       m['max_day_off_difference']        ?? 1,
  };
}

/** Load shifts map: deptId → {ca1, ca2}, key 'DEFAULT' = ca chung toàn công ty (department_id IS NULL) */
export async function loadShiftMap(monthId: string) {
  const conn = await getConn();
  const rawShifts = await conn.all<RawShift>(
    `SELECT id, department_id AS departmentId, shift_type AS shiftType,
            window_start AS windowStart, clock_in AS clockIn,
            clock_out AS clockOut, window_end AS windowEnd
     FROM shifts WHERE month_id = ?`, monthId
  );
  await conn.close();

  const map = new Map<string, { ca1: ShiftInfo | null; ca2: ShiftInfo | null }>();
  for (const s of rawShifts) {
    const key = s.departmentId ?? 'DEFAULT'; // NULL dept_id → ca chung
    if (!map.has(key)) map.set(key, { ca1: null, ca2: null });
    const entry = map.get(key)!;
    const info: ShiftInfo = {
      departmentId: s.departmentId,
      shiftType: s.shiftType?.includes('2') ? 'C2' : s.shiftType?.includes('1') ? 'C1' : 'C',
      windowStart: s.windowStart || s.clockIn,
      clockIn: s.clockIn,
      clockOut: s.clockOut,
      windowEnd: s.windowEnd || s.clockOut,
    };
    if (!s.shiftType || s.shiftType === 'Ca 1') entry.ca1 = info;
    else if (s.shiftType === 'Ca 2') entry.ca2 = info;
  }
  return map;
}

/** Tra cứu ca cho 1 dept, fallback về ca chung nếu không có ca riêng */
export function getShiftEntry(
  shiftMap: Map<string, { ca1: ShiftInfo | null; ca2: ShiftInfo | null }>,
  deptId: string | null,
) {
  const defaultEntry = shiftMap.get('DEFAULT') ?? { ca1: null, ca2: null };
  if (!deptId) return defaultEntry;
  return shiftMap.get(deptId) ?? defaultEntry;
}

/** Load set dayType của các loại nghỉ có paid = TRUE (tính công) */
export async function loadPaidDayTypes(monthId: string): Promise<Set<number>> {
  const conn = await getConn();
  const rows = await conn.all<{ code: string; dayType: number }>(
    `SELECT code, COALESCE(day_type, -1) AS dayType
     FROM leave_types WHERE month_id = ? AND paid = TRUE`, monthId
  );
  await conn.close();

  const set = new Set<number>();
  for (const row of rows) {
    const code = row.code.trim().toUpperCase();
    const dt = row.dayType >= 0 ? row.dayType : (DEFAULT_SYMBOL_MAP[code] ?? -1);
    if (dt >= 0) set.add(dt);
  }
  return set;
}

/** Load symbol → code map từ leave_types (X=0, LP=1, PN=2 cố định, còn lại tự gán) */
export async function loadSymbolMap(monthId: string): Promise<Record<string, number>> {
  const conn = await getConn();
  const rows = await conn.all<{ code: string; dayType: number }>(
    `SELECT code, COALESCE(day_type, -1) AS dayType
     FROM leave_types WHERE month_id = ?`, monthId
  );
  await conn.close();

  const map: Record<string, number> = { ...DEFAULT_SYMBOL_MAP };

  const usedCodes = new Set(Object.values(DEFAULT_SYMBOL_MAP));
  let nextCode = 15;

  for (const row of rows) {
    const code = row.code.trim().toUpperCase();
    if (code in map) continue;

    if (row.dayType >= 3 && !usedCodes.has(row.dayType)) {
      map[code] = row.dayType;
      usedCodes.add(row.dayType);
    } else {
      while (usedCodes.has(nextCode)) nextCode++;
      map[code] = nextCode;
      usedCodes.add(nextCode);
      nextCode++;
    }
  }

  return map;
}

/** Load accounting dept IDs */
export async function loadSpecialDeptIds(monthId: string) {
  const conn = await getConn();
  const depts = await conn.all<{ id: string; code: string; name: string }>(
    `SELECT id, code, name FROM departments WHERE month_id = ?`, monthId
  );
  await conn.close();
  const accountingIds = new Set(depts.filter(d => d.code === 'KT' || d.name.toLowerCase().includes('k\u1ebf to\u00e1n')).map(d => d.id));
  const bgdIds = new Set(depts.filter(d => d.code === 'BGD' || d.name.toLowerCase().includes('gi\u00e1m \u0111\u1ed1c')).map(d => d.id));
  return { accountingIds, bgdIds };
}

/** Get/upsert distribution_status */
export async function getStatus(monthId: string) {
  const conn = await getConn();
  const rows = await conn.all<Record<string, boolean | string>>(
    `SELECT * FROM distribution_status WHERE month_id = ?`, monthId
  );
  await conn.close();
  if (rows.length === 0) return {
    monthId, step1Done: false, step2Done: false, step3Done: false,
    step4Done: false, step5Done: false, step6Done: false,
  };
  const r = rows[0];
  return {
    monthId,
    step1Done: Boolean(r.step1_done), step2Done: Boolean(r.step2_done),
    step3Done: Boolean(r.step3_done), step4Done: Boolean(r.step4_done),
    step5Done: Boolean(r.step5_done), step6Done: Boolean(r.step6_done),
  };
}

export async function markStepDone(monthId: string, step: 1|2|3|4|5|6) {
  const conn = await getConn();
  const col = `step${step}_done`;
  const now = new Date().toISOString().slice(0, 19);
  try {
    await conn.run(
      `INSERT INTO distribution_status (month_id, ${col}, updated_at) VALUES (?, TRUE, ?)
       ON CONFLICT (month_id) DO UPDATE SET ${col} = TRUE, updated_at = ?`,
      monthId, now, now
    );
  } finally {
    await conn.close();
  }
}

/** Load month info → daysInMonth, month, year */
export async function loadMonthInfo(monthId: string) {
  const conn = await getConn();
  const rows = await conn.all<{ fromDate: string }>(
    `SELECT from_date AS fromDate FROM months WHERE id = ?`, monthId
  );
  await conn.close();
  if (!rows.length) throw new Error('Không tìm thấy tháng: ' + monthId);
  if (!rows[0].fromDate) throw new Error('Tháng ' + monthId + ' (Master Data) không có from_date, không thể xác định daysInMonth');
  const [, mStr, yStr] = rows[0].fromDate.split('/');
  const month = parseInt(mStr), year = parseInt(yStr);
  return { month, year, daysInMonth: new Date(year, month, 0).getDate() };
}
