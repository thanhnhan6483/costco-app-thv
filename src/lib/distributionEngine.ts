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
  maxConsecutiveDays: number;        // 6
  workdaysThreshold: number;         // 27
  pnStartFromDay: number;            // 15 (1-indexed)
  maxOtPerDayHours: number;          // 4
  otStartFromDay: number;            // 15
  maxLatePerDayMinutes: number;      // 14
  lateStartFromDay: number;          // 15
  specialGroupHourReduction: number; // 1
  skipEqualRestDeptCodes: string[];  // ['BGD'] — mã PB không phân bổ đồng đều LP
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
const SYMBOL_TO_CODE: Record<string, number> = {
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

function encodeDay(s: string): number {
  const v = (s ?? '').trim();
  return SYMBOL_TO_CODE[v] ?? 0;
}

/** Số ngày làm liên tiếp cuối tháng trước từ ngày nghỉ cuối */
export function calcConsecutiveDays(ngayNghi: string): number {
  if (!ngayNghi) return 0;
  const parts = ngayNghi.split('/').map(Number);
  if (parts.length < 2) return 0;
  const [d, m, y] = parts;
  const lastDay = new Date(y, m, 0).getDate();
  return Math.max(0, lastDay - d);
}

/** Đánh dấu tất cả Chủ Nhật là LP (code 1) — slot 0 còn trống mới đánh */
export function markSundays(
  inputArray: number[],
  daysInMonth: number,
  month: number,
  year: number,
): number[] {
  const arr = [...inputArray];
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = new Date(year, month - 1, d).getDay(); // 0 = Chủ Nhật
    if (weekday === 0 && arr[d - 1] === 0) {
      arr[d - 1] = 1; // LP – nghỉ Chủ Nhật
    }
  }
  return arr;
}

/* ── Bước 1: Encode input ────────────────────────── */
export function encodeInputArray(days: string[]): number[] {
  const arr = Array(31).fill(0);
  for (let i = 0; i < Math.min(days.length, 31); i++) {
    arr[i] = encodeDay(days[i]);
  }
  return arr;
}

/**
 * Tính ones (số ngày nghỉ LP) và zeros (số ngày làm X) cần đặt vào ô FREE
 *
 * Python: ones=4, zeros=26 cho workdays=27 (31-day month)
 * Vì PN đã được tính trong workdays nên zeros = workdays - 1
 * ones = freeSlots - zeros - 1(PN)
 */
function calcArrangementParams(
  fixedArray: number[],
  daysInMonth: number,
  workdays: number,
  phepNam = 1,        // số ngày PN cần phân bổ
  threshold = 27,     // workdays_algorithm_threshold
): { ones: number; zeros: number } {
  const freeSlots = fixedArray.slice(0, daysInMonth).filter(v => v === 0).length;

  // Python: zeros = threshold - phepNam (dùng threshold làm chuẩn)
  // Nếu workdays < threshold (có ngày đặc biệt Ô/TS): dùng workdays thực tế
  const base = workdays >= threshold ? threshold : Math.round(workdays);
  const zeros = Math.min(base - phepNam, freeSlots - phepNam);

  // ones = ngày nghỉ LP còn lại trong free slots
  const ones = Math.max(0, freeSlots - zeros - phepNam);
  return { ones, zeros };
}

/* ── Bước 2A: generate_random_arrangement (Python port) ── */
/**
 * Sinh arrangement mà KHÔNG đặt PN (PN luôn = false / bỏ qua option 2).
 * PN sẽ được đặt riêng bằng placePNAtEndOfRestPeriod() sau khi
 * backtracking hoàn tất, đảm bảo PN rơi vào cuối kỳ nghỉ.
 */
export function generateOneArrangement(
  pos: number,
  ones: number,
  zeros: number,
  twoPlaced: boolean,
  lastZeros: number,
  fixedArray: number[],
  current: number[],
  params: AllocParams,
  skipPN = false,  // true = không tự đặt PN trong backtracking
): number[] | null {
  const total = fixedArray.length;
  // Khi skipPN=true, kết thúc mà không yêu cầu twoPlaced
  if (pos === total) return (skipPN || twoPlaced) ? current : null;

  const fixed = fixedArray[pos];

  // Ngày đặc biệt (3..9: Ô,TS,DS,O,NL,OF,P) → giữ nguyên, reset lastZeros
  // Python: `if fixed_array[pos] not in {0,1,2}: pass through`
  if (fixed > 2) {
    return generateOneArrangement(
      pos + 1, ones, zeros, twoPlaced, 0,
      fixedArray, [...current, fixed], params, skipPN,
    );
  }

  // Ngày đã đánh dấu LP/CN (1) từ markSundays hoặc input → pass through, không tiêu ones
  if (fixed === 1) {
    return generateOneArrangement(
      pos + 1, ones, zeros, twoPlaced, 0,
      fixedArray, [...current, 1], params, skipPN,
    );
  }

  // Ngày đã đánh dấu PN (2) từ input → pass through, đánh dấu twoPlaced
  if (fixed === 2) {
    return generateOneArrangement(
      pos + 1, ones, zeros, true, 0,
      fixedArray, [...current, 2], params, skipPN,
    );
  }

  // fixed === 0: slot tự do → có thể đặt 0, 1, hoặc 2
  type Option = [number, number, boolean, number, number]; // ones, zeros, twoPlaced, lastZeros, value
  const options: Option[] = [];

  // Option 1: đặt ngày nghỉ (1)
  if (ones > 0)
    options.push([ones - 1, zeros, twoPlaced, 0, 1]);

  // Option 0: đặt ngày làm (0)
  if (zeros > 0 && lastZeros < params.maxConsecutiveDays)
    options.push([ones, zeros - 1, twoPlaced, lastZeros + 1, 0]);

  // Option 2: đặt phép năm (2) — chỉ khi KHÔNG dùng chế độ skipPN
  if (!skipPN && !twoPlaced && pos >= params.pnStartFromDay - 1)
    options.push([ones, zeros, true, 0, 2]);

  shuffle(options);

  for (const [no, nz, ntp, nlz, val] of options) {
    const result = generateOneArrangement(
      pos + 1, no, nz, ntp, nlz,
      fixedArray, [...current, val], params, skipPN,
    );
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
  phepNam = 1,  // số ngày PN cần đặt
): number[] {
  const arr = [...arrangement];
  const startIdx = params.pnStartFromDay - 1; // 0-based

  for (let pn = 0; pn < phepNam; pn++) {
    // Tìm tất cả LP run từ startIdx (mỗi lần lặp arr đã có PN từ vòng trước)
    interface Run { start: number; end: number; len: number }
    const runs: Run[] = [];
    let runStart = -1;
    for (let i = startIdx; i < daysInMonth; i++) {
      if (arr[i] === 1) {
        if (runStart === -1) runStart = i;
      } else {
        if (runStart !== -1) {
          runs.push({ start: runStart, end: i - 1, len: i - runStart });
          runStart = -1;
        }
      }
    }
    if (runStart !== -1) runs.push({ start: runStart, end: daysInMonth - 1, len: daysInMonth - runStart });

    let targetIdx = -1;
    if (runs.length > 0) {
      runs.sort((a, b) => b.len - a.len || b.end - a.end);
      targetIdx = runs[0].end;
    } else {
      // Không có LP từ pnStartFromDay → lấy LP cuối cùng trong toàn tháng
      for (let i = daysInMonth - 1; i >= 0; i--) {
        if (arr[i] === 1) { targetIdx = i; break; }
      }
    }

    if (targetIdx < 0) break; // Không có LP nào để đặt PN

    // Đảm bảo LP liền trước PN
    if (targetIdx > 0 && arr[targetIdx - 1] !== 1) {
      const dayBefore = targetIdx - 1;
      if (arr[dayBefore] === 0) {
        // Tìm LP trước pnStartFromDay để mượn
        let borrowIdx = -1;
        for (let i = startIdx - 1; i >= 0; i--) {
          if (arr[i] === 1) { borrowIdx = i; break; }
        }
        if (borrowIdx >= 0) {
          // Kiểm tra an toàn: xóa LP tại borrowIdx có gây ra consecutive run > maxConsecutiveDays không?
          const maxConsec = params.maxConsecutiveDays;
          let runLen = 0;
          for (let i = borrowIdx - 1; i >= 0 && arr[i] === 0; i--) runLen++;
          for (let i = borrowIdx + 1; i < daysInMonth && arr[i] === 0; i++) runLen++;
          // runLen = X ngày liền kề borrowIdx (nếu xóa LP → chúng hợp thành 1 run)
          if (runLen < maxConsec) {
            // An toàn → thực hiện swap
            arr[borrowIdx] = 0;
            arr[dayBefore]  = 1;
          }
          // Không an toàn → bỏ qua swap, PN có thể đứng cô lập (acceptable)
        }
      }
    }
    arr[targetIdx] = 2; // LP → PN
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

  // 2 tuần cuối → chọn 1 tuần, đặt PN vào cuối tuần đối diện
  const lastTwoWeeks: number[] = [];
  for (let d = daysInMonth - 13; d <= daysInMonth; d++) {
    if (d >= 1) lastTwoWeeks.push(d);
  }
  const chosenWeek = Math.random() < 0.5
    ? lastTwoWeeks.slice(0, 7)
    : lastTwoWeeks.slice(7);
  const oppWeekday = isSaturday ? 0 : 6; // CN nếu chọn T7, ngược lại
  const oppDays = chosenWeek.filter(d => {
    const wd = new Date(year, month - 1, d).getDay();
    return wd === oppWeekday;
  });
  if (oppDays.length > 0) {
    const chosen = oppDays[randInt(0, oppDays.length - 1)];
    if (arr[chosen - 1] === 0) arr[chosen - 1] = 2;
  }
  return arr;
}

/* ── Bước 3: Phân bổ OT ─────────────────────────── */
export function distributeOT(
  arrangement: number[],
  totalHours: number,
  params: AllocParams,
): number[] {
  const result = arrangement.map(v => (v !== 0 ? -1 : 0));
  let remaining = totalHours;
  let idx = params.otStartFromDay - 1;
  while (remaining > 0 && idx < result.length) {
    if (result[idx] === 0) {
      const amount = Math.min(randInt(1, params.maxOtPerDayHours), remaining);
      result[idx] = amount;
      remaining -= amount;
    }
    idx++;
  }
  return result;
}

/* ── Bước 4: Phân bổ Trễ ────────────────────────── */
export function distributeLate(
  arrangement: number[],
  totalMinutes: number,
  params: AllocParams,
): number[] {
  const result = arrangement.map(v => (v !== 0 ? -1 : 0));
  let remaining = totalMinutes;
  let idx = params.lateStartFromDay - 1;
  while (remaining > 0 && idx < result.length) {
    if (result[idx] === 0) {
      const amount = Math.min(randInt(1, params.maxLatePerDayMinutes), remaining);
      result[idx] = amount;
      remaining -= amount;
    }
    idx++;
  }
  return result;
}

/* ── Bước 5: Sinh giờ IN/OUT ─────────────────────── */
export function generateDayResults(
  daysInMonth: number,
  arrangement: number[],
  otArray: number[],
  lateArray: number[],
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
  groupWorkHours: number | null,  // null = không phải nhóm ĐT; số = giờ làm thực tế (VD: 7)
  params: AllocParams,
): DayResult[] {
  const results: DayResult[] = [];

  const defaultShift: ShiftInfo = {
    departmentId: null, shiftType: '',
    windowStart: '07:05', clockIn: '07:30',
    clockOut: '16:30', windowEnd: '16:35',
  };

  for (let d = 0; d < daysInMonth; d++) {
    const dayType = arrangement[d];
    const dayNum = d + 1;
    const result: DayResult = {
      day: dayNum, dayType, checkIn: '', checkOut: '',
      shiftCode: '', otHours: 0, lateMins: 0,
    };

    if (dayType === 0) {
      // Ngày làm việc
      let useShift: ShiftInfo;
      let shiftCode = '';

      if (shift1 && shift2) {
        // Dept có 2 ca: random Ca 1 hoặc Ca 2
        const pick = randInt(1, 2);
        useShift = pick === 1 ? shift1 : shift2;
        shiftCode = pick === 1 ? 'Ca 1' : 'Ca 2';
      } else if (shift1) {
        useShift = shift1;
        shiftCode = shift1.shiftType || '';
      } else {
        useShift = defaultShift;
      }

      result.shiftCode = shiftCode;
      let checkIn  = randomTime(useShift.windowStart, useShift.clockIn);
      let checkOut = randomTime(useShift.clockOut, useShift.windowEnd);

      // Điều chỉnh OT
      const ot = otArray[d];
      if (ot > 0 && ot !== -1) {
        checkOut = addMins(useShift.clockOut, ot * 60 + randInt(0, 10));
        result.otHours = ot;
      }
      // Điều chỉnh Trễ
      const late = lateArray[d];
      if (late > 0 && late !== -1) {
        checkIn = addMins(useShift.clockIn, late + 15); // +15 buffer
        result.lateMins = late;
      }
      // Nhóm đặc thù → checkout sớm hơn theo work_hours của nhóm
      if (groupWorkHours !== null) {
        const stdHours = 8; // giờ làm tiêu chuẩn
        const reduction = stdHours - groupWorkHours;
        if (reduction > 0) checkOut = addMins(checkOut, -reduction * 60);
      }

      result.checkIn  = typeof checkIn  === 'string' ? checkIn  : checkIn;
      result.checkOut = typeof checkOut === 'string' ? checkOut : checkOut;

    } else if (dayType === 1) {
      result.checkIn = '00:00'; result.checkOut = '00:00';
    } else if (dayType === 2) {
      result.checkIn = 'PN'; result.checkOut = 'PN';
    }
    // 3..9: check_in/out để trống, day_type giữ nguyên

    results.push(result);
  }
  return results;
}

/* ── Main: processEmployee ───────────────────────── */
export function processEmployee(
  emp: EmployeeInput,
  daysInMonth: number,
  month: number,
  year: number,
  params: AllocParams,
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
  isAccountingDept: boolean,
  groupWorkHours: number | null,  // null = bình thường; số = giờ làm nhóm ĐT (từ special_groups.work_hours)
): DayResult[] {
  const workdays     = parseFloat(emp.workdays)     || 27;
  const otHours      = parseFloat(emp.overtimeHours) || 0;
  const lateMinutes  = parseFloat(emp.lateMinutes)   || 0;

  const inputArray       = encodeInputArray(emp.days);
  const initialLastZeros = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);

  let arrangement: number[];

  if (isAccountingDept) {
    arrangement = generateCalendarArray(month, year, inputArray, params);
  } else if (workdays < params.workdaysThreshold) {
    // < 27: có ngày cố định (Ô/TS) → tính chính xác từ free slots
    const { ones, zeros } = calcArrangementParams(inputArray, daysInMonth, workdays);
    arrangement = generateOneArrangement(0, ones, zeros, false, initialLastZeros, inputArray, [], params) ?? inputArray;
  } else {
    // >= 27: không có ngày cố định → dùng emptyFixed, tính theo daysInMonth
    const emptyFixed = Array(daysInMonth).fill(0);
    const { ones, zeros } = calcArrangementParams(emptyFixed, daysInMonth, workdays);
    arrangement = generateOneArrangement(0, ones, zeros, false, initialLastZeros, emptyFixed, [], params) ?? emptyFixed;
  }

  const otArray   = otHours    > 0 ? distributeOT(arrangement, otHours, params)    : arrangement.map(v => v !== 0 ? -1 : 0);
  const lateArray = lateMinutes > 0 ? distributeLate(arrangement, lateMinutes, params) : arrangement.map(v => v !== 0 ? -1 : 0);

  return generateDayResults(daysInMonth, arrangement, otArray, lateArray, shift1, shift2, groupWorkHours, params);
}

/* ══════════════════════════════════════════════════════
   Step functions — mỗi bước có thể gọi độc lập
   ══════════════════════════════════════════════════════ */

/** Step 1 — Sinh arrangement (day_type)
 *  LP phân bổ hoàn toàn ngẫu nhiên vào bất kỳ ngày nào (không ép vào CN)
 *  Quy tắc PN: Ngày phép năm được ưu tiên xếp vào cuối kỳ nghỉ (cuối chuỗi LP dài nhất
 *  từ ngày pnStartFromDay trở đi). PN không còn được đặt ngẫu nhiên trong backtracking.
 */
export function step1_generateArrangement(
  emp: EmployeeInput,
  daysInMonth: number,
  month: number,
  year: number,
  params: AllocParams,
  isAccountingDept: boolean,
): number[] {
  const workdays         = parseFloat(emp.workdays) || 27;
  const phepNam          = Math.max(0, parseInt(emp.phepNam) || 1); // mặc định 1 PN (như Python)
  // Slice về đúng daysInMonth: fixedArray.length = daysInMonth
  // → backtracking dừng tại pos===daysInMonth (không phải luôn 31)
  // Python: luôn dùng 31 và budget=31, TS cần khớp budget với fixedArray.length
  const inputArray       = encodeInputArray(emp.days).slice(0, daysInMonth);
  const initialLastZeros = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);

  if (isAccountingDept) return generateCalendarArray(month, year, inputArray, params);

  // Không có ngày PN nào cần phân bổ
  if (phepNam === 0) {
    const { ones, zeros } = calcArrangementParams(inputArray, daysInMonth, workdays, 0, params.workdaysThreshold);
    return generateOneArrangement(0, ones, zeros, true, initialLastZeros, inputArray, [], params, true) ?? inputArray;
  }

  // Kiểm tra: input đã có PN cố định (từ file import)
  const fixedPnCount = inputArray.slice(0, daysInMonth).filter(v => v === 2).length;
  if (fixedPnCount >= phepNam) {
    // Đủ PN cố định → chỉ cần điền X và LP
    const { ones, zeros } = calcArrangementParams(inputArray, daysInMonth, workdays, fixedPnCount, params.workdaysThreshold);
    return generateOneArrangement(0, ones, zeros, true, initialLastZeros, inputArray, [], params, true) ?? inputArray;
  }
  // Một số PN đã cố định, còn lại cần sinh
  const remainingPn = phepNam - fixedPnCount;

  // ── Quy tắc mới: PN đặt vào cuối kỳ nghỉ ──
  const { ones, zeros } = calcArrangementParams(inputArray, daysInMonth, workdays, phepNam, params.workdaysThreshold);
  const MAX_RETRIES = 12;
  const startIdx = params.pnStartFromDay - 1; // 0-based

  /** Tính LP run dài nhất từ startIdx trong arrangement */
  function maxLpRun(arr: number[]): number {
    let best = 0, run = 0;
    for (let i = startIdx; i < daysInMonth; i++) {
      if (arr[i] === 1) { run++; if (run > best) best = run; }
      else { run = 0; }
    }
    return best;
  }

  let bestArr: number[] | null = null;
  let bestRunLen = -1;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const trial = generateOneArrangement(
      0, ones + remainingPn, zeros, true, initialLastZeros, inputArray, [], params, true,
    );
    if (!trial) continue;
    const runLen = maxLpRun(trial);
    if (runLen > bestRunLen) {
      bestRunLen = runLen;
      bestArr = trial;
      if (runLen >= 2) break;
    }
  }

  const rawArr = bestArr
    ?? generateOneArrangement(0, ones + remainingPn, zeros, true, initialLastZeros, inputArray, [], params, true)
    ?? inputArray;

  return placePNAtEndOfRestPeriod(rawArr, daysInMonth, params, phepNam);
}

/** Step 4 — Chia ca: với mỗi ngày làm, chọn Ca 1 hoặc Ca 2 */
export function step4_assignShift(
  dayType: number,
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
): string {
  if (dayType !== 0) return ''; // chỉ ngày làm mới có ca
  if (shift1 && shift2) return randInt(1, 2) === 1 ? 'Ca 1' : 'Ca 2';
  if (shift1) return shift1.shiftType || '';
  return '';
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
  windowStart: '07:05', clockIn: '07:30',
  clockOut: '16:30', windowEnd: '16:35',
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

  const shift = shiftCode === 'Ca 2' && shift2 ? shift2
    : shift1 ?? DEFAULT_SHIFT;

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
