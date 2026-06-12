/**
 * distributionEngine.ts
 * Port giải thuật từ hr_monthly_attendance_distribution.py
 */

/* ── Types ──────────────────────────────────────────── */
export interface ShiftInfo {
  departmentId: string | null;
  shiftType: string;       // 'Ca 1' | 'Ca 2' | ''
  windowStart: string;     // earliest check-in  e.g. '07:05'
  clockIn: string;         // standard check-in  e.g. '07:30'
  clockOut: string;        // standard check-out e.g. '16:30'
  windowEnd: string;       // latest check-out   e.g. '16:35'
}

export interface AllocParams {
  maxConsecutiveDays: number;
  workdaysThreshold: number;
  pnStartFromDay: number;
  maxOtPerDayHours: number;
  minOtPerDayMinutes: number;      // QT7: OT tối thiểu/ngày (phút), 0 = không áp dụng
  otStartFromDay: number;
  maxOtBetweenRestHours: number;   // QT9: OT tối đa giữa 2 ngày nghỉ (giờ)
  maxOtBalanceDiffMinutes: number; // QT8: chênh lệch OT tối đa trong phòng (phút)
  maxLatePerDayMinutes: number;
  lateStartFromDay: number;
  specialGroupHourReduction: number;
  skipEqualRestDeptCodes: string[];
  maxDayOffDifference: number;
}

export interface EmployeeInput {
  id: string;
  departmentId: string;
  specialGroup: string;
  groupCodeEndDate: string;
  ngayNghiCuoiThangTruoc: string;
  workdays: string;
  overtimeHours: string;
  lateMinutes: string;
  phepNam: string;
  days: string[];  // day_1..day_31 (index 0..30)
}

export interface DayResult {
  day: number;      // 1..31
  dayType: number;  // 0=làm, 1=nghỉ, 2=PN, 3..9=special
  checkIn: string;
  checkOut: string;
  shiftCode: string;
  otHours: number;
  lateMins: number;
}

/* ── Bảng mã ──────────────────────────────────────── */
export const DEFAULT_SYMBOL_MAP: Record<string, number> = {
  '': 0, 'X': 0, 'x': 0,
  'L': 1, 'LP': 1,
  'PN': 2,
  'Ô': 3,
  'TS': 4,
  'DS': 5,
  'O': 6,
  'NL': 7,
  'OF': 8,
  'P': 9,
  'X/2': 10,
  'LL': 11,
  'H': 13,
  'B': 14,
};

/* ── Helpers ─────────────────────────────────────── */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomTime(startHHMM: string, endHHMM: string): string {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  const startM = sh * 60 + sm;
  const endM   = eh * 60 + em;
  const r = startM + randInt(0, Math.max(0, endM - startM));
  return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
}

function addMins(hhMM: string, mins: number): string {
  const [h, m] = hhMM.split(':').map(Number);
  const t = h * 60 + m + Math.round(mins);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function encodeDay(s: string, symbolMap?: Record<string, number>): number {
  const v = (s ?? '').trim();
  return (symbolMap ?? DEFAULT_SYMBOL_MAP)[v] ?? 0;
}

/** Số Giới hạn ngày làm liên tục cuối tháng trước từ ngày nghỉ cuối */
export function calcConsecutiveDays(ngayNghi: string): number {
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
}

/* ── Bước 1: Encode input ────────────────────────── */
export function encodeInputArray(days: string[], symbolMap?: Record<string, number>): number[] {
  const arr = Array(31).fill(0);
  for (let i = 0; i < Math.min(days.length, 31); i++) {
    arr[i] = encodeDay(days[i], symbolMap);
  }
  return arr;
}

/* ── Bước 2A: generate_random_arrangement (Python port) ── */
/**
 * Sinh arrangement với PN inline (giống Python gốc generate_random_arrangement).
 * PN (value=2) được đặt tại pos >= pnStartFromDay, hoạt động như 1 breaker
 * giúp constraint maxConsecutiveDays luôn được thỏa mãn ngay từ đầu.
 * Không cần placePNAtEndOfRestPeriod sau backtracking.
 */
export function generateOneArrangement(
  pos: number,
  ones: number,
  zeros: number,
  pnRemaining: number,
  lastZeros: number,
  fixedArray: number[],
  current: number[],
  params: AllocParams,
  daysInMonth: number,
  dailyRest?: number[],
  targetRest?: number,
): number[] | null {
  const total = fixedArray.length;
  if (pos === total) return pnRemaining === 0 ? current : null;

  const fixed = fixedArray[pos];
  if (fixed !== 0) {
    return generateOneArrangement(
      pos + 1, ones, zeros, pnRemaining, 0,
      fixedArray, [...current, fixed], params, daysInMonth,
      dailyRest, targetRest,
    );
  }

  type Option = [number, number, number, number, number];
  const options: Option[] = [];

  if (ones > 0 && pos < daysInMonth)
    options.push([ones - 1, zeros, pnRemaining, 0, 1]);   // LP
  if (zeros > 0 && (lastZeros < params.maxConsecutiveDays || pos >= daysInMonth))
    options.push([ones, zeros - 1, pnRemaining, lastZeros + 1, 0]); // X
  if (pnRemaining > 0 && pos >= params.pnStartFromDay - 1)
    options.push([ones, zeros, pnRemaining - 1, 0, 2]);   // PN

  if (options.length > 1) {
    if (dailyRest && targetRest !== undefined) {
      const lpFirst = dailyRest[pos] < targetRest;
      if (!lpFirst && Math.random() < 0.7) options.reverse();
    } else if (Math.random() < 0.5) {
      options.reverse();
    }
  }

  for (const [no, nz, npr, nlz, val] of options) {
    const result = generateOneArrangement(pos + 1, no, nz, npr, nlz, fixedArray, [...current, val], params, daysInMonth, dailyRest, targetRest);
    if (result) return result;
  }
  return null;
}

/**
 * Đặt PN vào cuối kỳ nghỉ:
 * Tìm chuỗi ngày LP liên tiếp dài nhất bắt đầu từ pnStartFromDay,
 * lấy ngày CUỐI của chuỗi đó → đổi thành PN (code 2).
 * Nếu không có chuỗi LP nào, lấy ngày LP cuối cùng trong tháng.
 * Nếu hoàn toàn không có LP nào khả dụng, bỏ qua (trường hợp hiếm).
 */
export function placePNAtEndOfRestPeriod(
  arrangement: number[],
  daysInMonth: number,
  params: AllocParams,
  phepNam = 1,
): number[] {
  const arr = [...arrangement];
  const startIdx = params.pnStartFromDay - 1;

  // Tìm LP cuối cùng trong toàn tháng (PN bắt buộc sau LP)
  let lastLP = -1;
  for (let i = daysInMonth - 1; i >= 0; i--) {
    if (arr[i] === 1) { lastLP = i; break; }
  }

  // Nếu LP ở ngày cuối tháng → swap với X gần cuối để tạo chỗ đặt PN
  if (lastLP >= 0 && lastLP === daysInMonth - 1) {
    for (let i = lastLP - 1; i >= 0; i--) {
      if (arr[i] === 0) {
        arr[lastLP] = 0;
        arr[i] = 1;
        lastLP = i;
        break;
      }
    }
  }

  const afterBoundary = lastLP + 1;

  // Pool 1: sau LP + sau pnStartFromDay (ưu tiên nhất)
  const afterLP: number[] = [];
  for (let i = Math.max(afterBoundary, startIdx); i < daysInMonth; i++) {
    if (arr[i] === 0) afterLP.push(i);
  }

  // Pool 2: sau LP + trước pnStartFromDay (fallback khi hết chỗ)
  const beforeFromDay: number[] = [];
  for (let i = afterBoundary; i < startIdx; i++) {
    if (arr[i] === 0) beforeFromDay.push(i);
  }

  // Pool 3: X từ startIdx trở đi (fallback cuối khi LP ở vị trí cuối tháng)
  const anyX: number[] = [];
  for (let i = Math.max(startIdx, afterBoundary); i < daysInMonth; i++) {
    if (arr[i] === 0) anyX.push(i);
  }

  for (let pn = 0; pn < phepNam; pn++) {
    let idx = -1;
    if (afterLP.length > 0) {
      const pick = Math.floor(Math.random() * afterLP.length);
      idx = afterLP.splice(pick, 1)[0];
    } else if (beforeFromDay.length > 0) {
      const pick = Math.floor(Math.random() * beforeFromDay.length);
      idx = beforeFromDay.splice(pick, 1)[0];
    } else if (anyX.length > 0) {
      const pick = Math.floor(Math.random() * anyX.length);
      idx = anyX.splice(pick, 1)[0];
    } else if (lastLP >= 0) {
      // Pool 4: không có X sau LP → swap LP cuối với X gần nhất trước nó
      for (let i = lastLP - 1; i >= 0; i--) {
        if (arr[i] === 0) {
          arr[lastLP] = 0;
          arr[i] = 1;
          idx = lastLP;
          break;
        }
      }
      if (idx < 0) break;
    } else {
      break;
    }
    arr[idx] = 2;
  }

  return arr;
}

/* ── Bước 2B: generate_calendar_array (Kế Toán) ── */
export function generateCalendarArray(
  month: number, year: number,
  inputArray: number[],
  params: AllocParams,
): number[] {
  const arr = [...inputArray];
  while (arr.length < 31) arr.push(0);

  // Chọn ngẫu nhiên nghỉ Thứ 7 hoặc Chủ Nhật
  const isSaturday = Math.random() < 0.5;

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = new Date(year, month - 1, d).getDay(); // 0=CN, 6=T7
    if (arr[d - 1] === 0) {
      if ((isSaturday && weekday === 6) || (!isSaturday && weekday === 0)) {
        arr[d - 1] = 1;
      }
    }
  }

  return arr;
}

/* ── Bước 3: Phân bổ OT ─────────────────────────── */
export function distributeOT(
  arrangement: number[],
  totalHours: number,
  params: AllocParams,
): number[] {
  const result: number[] = arrangement.map(v => (v !== 0 ? -1 : 0));
  let remaining = totalHours;
  const minOtH = params.minOtPerDayMinutes > 0 ? params.minOtPerDayMinutes / 60 : 0;
  const maxBetweenH = params.maxOtBetweenRestHours ?? 12;

  // Tính OT tích lũy giữa 2 ngày nghỉ (QT9)
  // Mỗi "kỳ" là chuỗi Giới hạn ngày làm liên tục giữa 2 ngày nghỉ
  // Xây dựng map: index → periodId
  const periodId: number[] = new Array(arrangement.length).fill(-1);
  let pid = 0;
  let inWork = false;
  for (let i = 0; i < arrangement.length; i++) {
    if (arrangement[i] === 0) {
      if (!inWork) { inWork = true; pid++; }
      periodId[i] = pid;
    } else {
      inWork = false;
    }
  }
  const periodOT = new Map<number, number>(); // pid → tổng OT đã phân bổ (giờ)

  // Rải đều: shuffle thay vì tuần tự
  const eligible: number[] = [];
  for (let i = params.otStartFromDay - 1; i < result.length; i++) {
    if (result[i] === 0) eligible.push(i);
  }
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  for (const idx of eligible) {
    if (remaining <= 0) break;
    const pid2 = periodId[idx];
    const usedInPeriod = periodOT.get(pid2) ?? 0;
    const canAddInPeriod = Math.max(0, maxBetweenH - usedInPeriod);
    if (canAddInPeriod <= 0) continue;

    const lo = minOtH > 0 ? Math.min(minOtH, remaining, params.maxOtPerDayHours) : 1;
    const hi = Math.min(params.maxOtPerDayHours, remaining, canAddInPeriod);
    if (lo > hi) continue;

    const amount = lo + Math.random() * (hi - lo);
    const rounded = Math.round(amount * 4) / 4;
    result[idx] = rounded;
    remaining -= rounded;
    periodOT.set(pid2, usedInPeriod + rounded);
  }

  // Fallback: nếu còn remaining (tất cả period đã đầy QT9), phân bổ tiếp bỏ qua giới hạn period
  if (remaining > 0) {
    let idx = params.otStartFromDay - 1;
    while (remaining > 0 && idx < result.length) {
      if (result[idx] >= 0) {
        const cur = result[idx] > 0 ? result[idx] : 0;
        const add = Math.min(params.maxOtPerDayHours - cur, remaining);
        if (add <= 0) { idx++; continue; }
        if (cur === 0 && add < minOtH) { idx++; continue; }
        result[idx] = cur + add;
        remaining -= add;
      }
      idx++;
    }
    // Nếu còn dư rất nhỏ, tìm ngày có OT sẵn để gom vào
    if (remaining > 0 && remaining < minOtH) {
      for (let i = params.otStartFromDay - 1; i < result.length && remaining > 0; i++) {
        if (result[i] > 0 && result[i] < params.maxOtPerDayHours) {
          const add = Math.min(params.maxOtPerDayHours - result[i], remaining);
          result[i] += add;
          remaining -= add;
        }
      }
    }
  }

  return result;
}

/* ── Bước 4: Phân bổ Trễ ────────────────────────── */
export function distributeLate(
  arrangement: number[],
  totalMinutes: number,
  params: AllocParams,
): number[] {
  const result: number[] = arrangement.map(v => (v !== 0 ? -1 : 0));
  let remaining = totalMinutes;
  // Rải đều: shuffle thay vì tuần tự
  const eligible: number[] = [];
  for (let i = params.lateStartFromDay - 1; i < result.length; i++) {
    if (result[i] === 0) eligible.push(i);
  }
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  for (const idx of eligible) {
    if (remaining <= 0) break;
    const amount = Math.min(randInt(1, params.maxLatePerDayMinutes), remaining);
    result[idx] = amount;
    remaining -= amount;
  }
  return result;
}

/* ══════════════════════════════════════════════════════
   Step functions — mỗi bước có thể gọi độc lập
   ══════════════════════════════════════════════════════ */

/** Step 1 — Sinh arrangement (day_type)
 *  Giống Python gốc generate_random_arrangement:
 *  - LP, X, PN đều đặt trong 1 lần backtracking
 *  - Không cần minLP/clamp/recover — NL/Ô/PN tự động là natural breaker
 *  - Kế toán: dùng generateCalendarArray
 */
export function step1_generateArrangement(
  emp: EmployeeInput,
  daysInMonth: number,
  month: number,
  year: number,
  params: AllocParams,
  isAccountingDept: boolean,
  symbolMap?: Record<string, number>,
  dailyRest?: number[],
  targetRest?: number,
  paidDayTypes?: Set<number>,
): number[] {
  const workdays = emp.workdays !== '' && emp.workdays !== null && emp.workdays !== undefined
    ? (parseFloat(String(emp.workdays)) || 0)
    : 27;

  const inputArray = encodeInputArray(emp.days, symbolMap); // length 31

  const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));

  if (isAccountingDept) {
    const workdaysVal = Math.round(workdays);
    let arrangement = generateCalendarArray(month, year, inputArray.slice(0, daysInMonth), params);
    const paidCnt = arrangement.filter(v => paidDayTypes?.has(v)).length;
    let xCnt = arrangement.filter(v => v === 0).length;
    let pbnc = xCnt + paidCnt;
    if (pbnc > workdaysVal) {
      let excess = pbnc - workdaysVal;
      for (let i = daysInMonth - 1; i >= 0 && excess > 0; i--) {
        if (arrangement[i] === 0) { arrangement[i] = 1; excess--; }
      }
    } else if (pbnc < workdaysVal) {
      let deficit = workdaysVal - pbnc;
      for (let i = daysInMonth - 1; i >= 0 && deficit > 0; i--) {
        if (arrangement[i] === 1) { arrangement[i] = 0; deficit--; }
      }
    }
    if (phepNam > 0) arrangement = placePNAtEndOfRestPeriod(arrangement, daysInMonth, params, phepNam);
    return arrangement;
  }

  if (workdays === 0) {
    const arr = inputArray.slice(0, 31);
    for (let i = 0; i < 31; i++) {
      if (arr[i] === 0 && i < daysInMonth) arr[i] = 1;
    }
    return arr;
  }

  const initialLastZeros = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);

  const totalDays = 31;
  const fixedArray = inputArray.slice(0, totalDays);
  if (workdays >= params.workdaysThreshold) {
    for (let i = 0; i < totalDays; i++) {
      if (fixedArray[i] <= 1) fixedArray[i] = 0;
    }
  }

  const freeSlots = fixedArray.filter(v => v === 0).length;
  const normalizedWd = parseFloat(emp.workdays) || workdays;

  const workdaysVal = Math.round(normalizedWd);
  const preExistingPaidDays = paidDayTypes?.size
    ? fixedArray.filter(v => v !== 0 && paidDayTypes.has(v)).length
    : 0;
  const remainingWorkdays = Math.max(0, workdaysVal - preExistingPaidDays - phepNam);
  // ZEROS = X, ONES = LP, pnRemaining = PN — tổng vừa đủ freeSlots
  // paddedCount (31-daysInMonth) positions bắt buộc là X do pos >= daysInMonth
  // nên LP/PN không thể đặt vào đó → ZEROS phải bao gồm paddedCount
  const paddedCount = Math.max(0, 31 - daysInMonth);
  let ZEROS = Math.min(remainingWorkdays + paddedCount, Math.max(0, freeSlots - phepNam));
  let ONES = Math.max(0, freeSlots - ZEROS - phepNam);
  let pnRemaining = phepNam;

  let arrangement: number[] | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    arrangement = generateOneArrangement(0, ONES, ZEROS, pnRemaining, initialLastZeros, fixedArray, [], params, daysInMonth, dailyRest, targetRest);
    if (arrangement) break;
  }
  for (let extra = 1; !arrangement && extra <= 5; extra++) {
    ONES = ONES + 1;
    ZEROS = Math.max(0, freeSlots - ONES - phepNam);
    if (ZEROS < remainingWorkdays + paddedCount) break;
    for (let attempt = 0; attempt < 3; attempt++) {
      arrangement = generateOneArrangement(0, ONES, ZEROS, pnRemaining, initialLastZeros, fixedArray, [], params, daysInMonth, dailyRest, targetRest);
      if (arrangement) break;
    }
  }
  if (!arrangement) arrangement = fixedArray;

  return arrangement;
}

/** Step 4 — Chia ca cho 1 ngày (dùng khi chỉ có 1 ca) */
export function step4_assignShift(
  dayType: number,
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
): string {
  if (dayType !== 0) return '';
  if (shift1 && shift2) return randInt(1, 2) === 1 ? 'C1' : 'C2';
  if (shift1) return shift1.shiftType || '';
  return '';
}

/**
 * Step 4 — Chia ca cho toàn bộ ngày làm của 1 NV.
 * Nếu có cả Ca 1 và Ca 2: phân bổ đều 50/50, xen kẽ theo tuần
 * (tuần lẻ Ca 1, tuần chẵn Ca 2, hoặc ngược lại — chọn ngẫu nhiên 1 lần/NV).
 */
export function step4_assignShiftsBatch(
  days: { day: number; dayType: number }[],
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
  isCommonShift = false,  // true = ca chung (không có ca riêng theo phòng ban)
): { day: number; shiftCode: string }[] {
  if (!shift1 || !shift2) {
    // Chỉ 1 ca → gán tất cả ngày làm cùng ca đó
    const single = shift1 ?? shift2;
    const code = isCommonShift ? 'C' : (single ? (single.shiftType || '') : '');
    return days.map(d => ({ day: d.day, shiftCode: d.dayType === 0 ? code : '' }));
  }

  // Có 2 ca → random mỗi ngày độc lập (theo Python gốc: random.randint(1,2))
  return days.map(d => {
    if (d.dayType !== 0) return { day: d.day, shiftCode: '' };
    return { day: d.day, shiftCode: randInt(1, 2) === 1 ? 'C1' : 'C2' };
  });
}

/** Step 5 — Phân phối OT & Trễ cho từng ngày */
export function step5_distributeOTLate(
  arrangement: number[],
  otHours: number,
  lateMinutes: number,
  params: AllocParams,
): { otH: number; lateM: number }[] {
  const otArr   = otHours    > 0 ? distributeOT(arrangement, otHours, params)    : arrangement.map(v => v !== 0 ? -1 : 0);
  const lateArr = lateMinutes > 0 ? distributeLate(arrangement, lateMinutes, params) : arrangement.map(v => v !== 0 ? -1 : 0);
  return arrangement.map((_, i) => ({
    otH:   otArr[i]   > 0 ? otArr[i]   : 0,
    lateM: lateArr[i] > 0 ? lateArr[i] : 0,
  }));
}

const DEFAULT_SHIFT: ShiftInfo = {
  departmentId: null, shiftType: '',
  windowStart: '07:05', clockIn: '07:45',
  clockOut: '16:25', windowEnd: '16:40',
};

/** Step 6 — Sinh giờ IN/OUT cho 1 ngày */
export function step6_generateTime(
  dayType: number,
  otHours: number,
  lateMins: number,
  shiftCode: string,
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
  groupWorkHours: number | null,  // null = bình thường; số = giờ làm nhóm ĐT
  params: AllocParams,
): { checkIn: string; checkOut: string } {
  if (dayType === 1) return { checkIn: '00:00', checkOut: '00:00' };
  if (dayType === 2) return { checkIn: 'PN', checkOut: 'PN' };
  if (dayType !== 0) return { checkIn: '', checkOut: '' };

  const shift = (shiftCode === 'C2' && shift2) ? shift2
    : (shiftCode === 'C1' && shift1) ? shift1
    : shift1 ?? shift2 ?? DEFAULT_SHIFT;

  let checkIn  = randomTime(shift.windowStart, shift.clockIn);
  let checkOut = randomTime(shift.clockOut, shift.windowEnd);

  if (otHours > 0)  checkOut = addMins(shift.clockOut, otHours * 60 + randInt(0, 10));
  if (lateMins > 0) checkIn  = addMins(shift.clockIn, lateMins + 15);
  if (groupWorkHours !== null) {
    const reduction = 8 - groupWorkHours;
    if (reduction > 0) checkOut = addMins(checkOut, -reduction * 60);
  }

  return { checkIn, checkOut };
}


/* ── generateDayResults ─────────────────────────── */
export function generateDayResults(
  daysInMonth: number,
  arrangement: number[],
  otArray: number[],
  lateArray: number[],
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
  groupWorkHours: number | null,
  params: AllocParams,
): DayResult[] {
  const results: DayResult[] = [];
  const defaultShift: ShiftInfo = {
    departmentId: null, shiftType: '',
    windowStart: '07:05', clockIn: '07:30',
    clockOut: '16:30', windowEnd: '16:35',
  };
  // Luôn tạo 31 DayResult (giống Python: 31 ô cho mọi tháng)
  // Tháng ngắn (28-30 ngày) sẽ có padded positions ở cuối
  for (let d = 0; d < 31; d++) {
    const dayType = arrangement[d];
    const result: DayResult = { day: d + 1, dayType, checkIn: '', checkOut: '', shiftCode: '', otHours: 0, lateMins: 0 };
    if (dayType === 0) {
      let useShift: ShiftInfo;
      let shiftCode = '';
      if (shift1 && shift2) { const pick = randInt(1, 2); useShift = pick === 1 ? shift1 : shift2; shiftCode = pick === 1 ? 'Ca 1' : 'Ca 2'; }
      else if (shift1) { useShift = shift1; shiftCode = shift1.shiftType || ''; }
      else { useShift = defaultShift; }
      result.shiftCode = shiftCode;
      let checkIn  = randomTime(useShift.windowStart, useShift.clockIn);
      let checkOut = randomTime(useShift.clockOut, useShift.windowEnd);
      const ot = otArray[d];
      if (ot > 0 && ot !== -1) { checkOut = addMins(useShift.clockOut, ot * 60 + randInt(0, 10)); result.otHours = ot; }
      const late = lateArray[d];
      if (late > 0 && late !== -1) { checkIn = addMins(useShift.clockIn, late + 15); result.lateMins = late; }
      if (groupWorkHours !== null) { const r = 8 - groupWorkHours; if (r > 0) checkOut = addMins(checkOut, -r * 60); }
      result.checkIn = checkIn; result.checkOut = checkOut;
    } else if (dayType === 1) { result.checkIn = '00:00'; result.checkOut = '00:00';
    } else if (dayType === 2) { result.checkIn = 'PN'; result.checkOut = 'PN'; }
    results.push(result);
  }
  return results;
}

/* ── processEmployee ────────────────────────────── */
export function processEmployee(
  emp: EmployeeInput,
  daysInMonth: number,
  month: number,
  year: number,
  params: AllocParams,
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
  isAccountingDept: boolean,
  groupWorkHours: number | null,
  symbolMap?: Record<string, number>,
  paidDayTypes?: Set<number>,
): DayResult[] {
  const workdays    = isNaN(parseFloat(emp.workdays)) ? 27 : parseFloat(emp.workdays);
  const otHours     = parseFloat(emp.overtimeHours) || 0;
  const lateMinutes = parseFloat(emp.lateMinutes)   || 0;
  const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));
  const inputArray       = encodeInputArray(emp.days, symbolMap);
  const initialLastZeros = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);

  // Xây fixedArray giống step1_generateArrangement (luôn 31 positions)
  const totalDays = 31;
  const fixedArray = inputArray.slice(0, totalDays);
  if (workdays >= params.workdaysThreshold) {
    for (let i = 0; i < totalDays; i++) {
      if (fixedArray[i] <= 1) fixedArray[i] = 0;
    }
  }

  let arrangement: number[] | null = null;
  if (isAccountingDept) {
    const workdaysVal = Math.round(workdays);
    arrangement = generateCalendarArray(month, year, inputArray, params);
    const paidCnt = arrangement.filter(v => paidDayTypes?.has(v)).length;
    let xCnt = arrangement.filter(v => v === 0).length;
    let pbnc = xCnt + paidCnt;
    if (pbnc > workdaysVal) {
      let excess = pbnc - workdaysVal;
      for (let i = daysInMonth - 1; i >= 0 && excess > 0; i--) {
        if (arrangement[i] === 0) { arrangement[i] = 1; excess--; }
      }
    } else if (pbnc < workdaysVal) {
      let deficit = workdaysVal - pbnc;
      for (let i = daysInMonth - 1; i >= 0 && deficit > 0; i--) {
        if (arrangement[i] === 1) { arrangement[i] = 0; deficit--; }
      }
    }
    if (phepNam > 0) arrangement = placePNAtEndOfRestPeriod(arrangement, daysInMonth, params, phepNam);
  } else {
    const freeSlots = fixedArray.filter(v => v === 0).length;
    const workdaysVal = Math.round(workdays);
    const preExistingPaidDays = paidDayTypes?.size
      ? fixedArray.filter(v => v !== 0 && paidDayTypes.has(v)).length
      : 0;
    const remainingWorkdays = Math.max(0, workdaysVal - preExistingPaidDays - phepNam);
    const paddedCount = Math.max(0, 31 - daysInMonth);
    let ZEROS = Math.min(remainingWorkdays + paddedCount, Math.max(0, freeSlots - phepNam));
    let ONES = Math.max(0, freeSlots - ZEROS - phepNam);
    const pnRemaining = phepNam;

    for (let attempt = 0; attempt < 5; attempt++) {
      arrangement = generateOneArrangement(0, ONES, ZEROS, pnRemaining, initialLastZeros, fixedArray, [], params, daysInMonth);
      if (arrangement) break;
    }
    for (let extra = 1; !arrangement && extra <= 5; extra++) {
      ONES = ONES + 1;
      ZEROS = Math.max(0, freeSlots - ONES - phepNam);
      if (ZEROS < remainingWorkdays + paddedCount) break;
      for (let attempt = 0; attempt < 3; attempt++) {
        arrangement = generateOneArrangement(0, ONES, ZEROS, pnRemaining, initialLastZeros, fixedArray, [], params, daysInMonth);
        if (arrangement) break;
      }
    }
    arrangement = arrangement ?? fixedArray;
  }
  arrangement = arrangement!;
  const otArray   = otHours    > 0 ? distributeOT(arrangement, otHours, params)       : arrangement.map(v => v !== 0 ? -1 : 0);
  const lateArray = lateMinutes > 0 ? distributeLate(arrangement, lateMinutes, params) : arrangement.map(v => v !== 0 ? -1 : 0);
  return generateDayResults(daysInMonth, arrangement, otArray, lateArray, shift1, shift2, groupWorkHours, params);
}
