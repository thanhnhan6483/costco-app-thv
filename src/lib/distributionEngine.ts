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
 * Sinh arrangement với PN inline (giống Python gốc generate_random_arrangement).
 * PN (value=2) được đặt tại pos >= pnStartFromDay, hoạt động như 1 breaker
 * giúp constraint maxConsecutiveDays luôn được thỏa mãn ngay từ đầu.
 * Không cần placePNAtEndOfRestPeriod sau backtracking.
 */
export function generateOneArrangement(
  pos: number,
  ones: number,
  zeros: number,
  twoRemaining: number,
  lastZeros: number,
  fixedArray: number[],
  current: number[],
  params: AllocParams,
): number[] | null {
  const total = fixedArray.length;
  if (pos === total) {
    // Tất cả PN phải được đặt trước khi kết thúc
    return twoRemaining === 0 ? current : null;
  }

  const fixed = fixedArray[pos];

  // Pass-through nếu đã cố định (CN=1, PN=2, NL/Ô/TS≥3), reset lastZeros=0
  if (fixed !== 0) {
    return generateOneArrangement(
      pos + 1, ones, zeros, twoRemaining, 0,
      fixedArray, [...current, fixed], params,
    );
  }

  // fixed === 0: thử 3 options LP / X / PN (xáo trộn ngẫu nhiên)
  type Option = [number, number, number, number, number];
  const options: Option[] = [];

  if (ones > 0)
    options.push([ones - 1, zeros, twoRemaining, 0, 1]);   // LP
  if (zeros > 0 && lastZeros < params.maxConsecutiveDays)
    options.push([ones, zeros - 1, twoRemaining, lastZeros + 1, 0]); // X
  if (twoRemaining > 0 && pos >= params.pnStartFromDay - 1)
    options.push([ones, zeros, twoRemaining - 1, 0, 2]);   // PN

  if (options.length > 1 && Math.random() < 0.5) options.reverse();

  for (const [no, nz, ntr, nlz, val] of options) {
    const result = generateOneArrangement(pos + 1, no, nz, ntr, nlz, fixedArray, [...current, val], params);
    if (result) return result;
  }
  return null;
}

/**
 * Greedy O(n) — sinh arrangement ngày công.
 *
 * Thuật toán:
 * 1. Xác định free slots (ô = 0)
 * 2. Tính vị trí LP "bắt buộc": mỗi khi run X sắp vượt max, đánh dấu vị trí đó
 * 3. Đặt LP bắt buộc trước, còn lại phân bổ ngẫu nhiên từ free slots còn lại
 * 4. Lượt quét cuối: swap LP để sửa vi phạm còn sót (giữ tổng LP không đổi)
 *
 * Đảm bảo:
 * - Tổng LP = targetLP (không thêm không bớt, trừ khi targetLP < số LP bắt buộc)
 * - Không có run X > maxConsecutiveDays (kể cả xuyên tháng qua initialLastZeros)
 * - Ngày fixed (NL/Ô/TS...) được giữ nguyên
 *
 * @param fixedArray       mảng 0..daysInMonth-1, ô = 0 là free, > 0 là cố định
 * @param params           alloc params
 * @param targetLP         số LP cần đặt (= freeSlots - workdays - phepNam)
 * @param initialLastZeros số Giới hạn ngày làm liên tục cuối tháng trước (mặc định 0)
 */
export function generateOneArrangementGreedy(
  fixedArray: number[],
  params: AllocParams,
  targetLP: number,
  initialLastZeros = 0,
): number[] {
  const total = fixedArray.length;
  const arr = [...fixedArray];
  const max = params.maxConsecutiveDays;

  // Collect free slots (chỉ ô = 0)
  const freeSet = new Set<number>();
  for (let i = 0; i < total; i++) if (arr[i] === 0) freeSet.add(i);

  const ONES = Math.min(Math.max(0, targetLP), freeSet.size);
  if (ONES === 0) return arr;

  // Bước 1: Xác định vị trí LP bắt buộc
  // Mô phỏng chạy qua mảng với initialLastZeros, mỗi khi run = max+1 → vị trí đó bắt buộc LP
  const mustLP = new Set<number>();
  let run = initialLastZeros;
  for (let i = 0; i < total; i++) {
    if (arr[i] === 0) {
      run++;
      if (run > max && freeSet.has(i)) {
        mustLP.add(i);
        run = 0; // sau khi đặt LP tại i, run reset
      }
    } else {
      run = 0;
    }
  }

  // Bước 2: Phân bổ LP
  // Ưu tiên vị trí bắt buộc, còn lại random từ free slots còn lại
  const lpSet = new Set<number>();

  // Đặt tất cả vị trí bắt buộc (nếu vượt ONES thì chỉ lấy đủ ONES)
  for (const pos of mustLP) {
    if (lpSet.size >= ONES) break;
    lpSet.add(pos);
  }

  // Nếu chưa đủ ONES → thêm từ free slots còn lại (random)
  if (lpSet.size < ONES) {
    const optional = [...freeSet].filter(i => !lpSet.has(i));
    // Shuffle optional
    for (let i = optional.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [optional[i], optional[j]] = [optional[j], optional[i]];
    }
    for (const pos of optional) {
      if (lpSet.size >= ONES) break;
      lpSet.add(pos);
    }
  }

  // Áp dụng LP vào arr
  for (const pos of lpSet) arr[pos] = 1;

  // Bước 3: Lượt quét cuối — sửa vi phạm còn sót bằng swap (giữ tổng LP)
  // Vi phạm còn sót xảy ra khi mustLP bị giới hạn bởi ONES < số vi phạm thực tế
  run = initialLastZeros;
  for (let i = 0; i < total; i++) {
    if (arr[i] === 0) {
      run++;
      if (run > max) {
        // Vị trí cần chèn LP: đầu của đoạn vi phạm = i - max
        const insertPos = i - max; // 0-based, luôn >= 0 vì run > max
        if (insertPos >= 0 && arr[insertPos] === 0) {
          // Tìm LP phía sau để swap (giữ tổng LP không đổi)
          let swapped = false;
          for (let j = i + 1; j < total; j++) {
            if (arr[j] === 1) {
              arr[j] = 0;
              arr[insertPos] = 1;
              run = max; // run tại insertPos = max (vừa đủ)
              swapped = true;
              break;
            }
          }
          if (!swapped) {
            // Không có LP phía sau → tìm LP phía trước insertPos
            for (let j = insertPos - 1; j >= 0; j--) {
              if (arr[j] === 1) {
                arr[j] = 0;
                arr[insertPos] = 1;
                run = max;
                break;
              }
            }
          }
        }
      }
    } else {
      run = 0;
    }
  }

  return arr;
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

  let idx = params.otStartFromDay - 1;
  while (remaining > 0 && idx < result.length) {
    if (result[idx] === 0) {
      const pid2 = periodId[idx];
      const usedInPeriod = periodOT.get(pid2) ?? 0;
      const canAddInPeriod = Math.max(0, maxBetweenH - usedInPeriod);
      if (canAddInPeriod <= 0) { idx++; continue; }

      const lo = minOtH > 0 ? Math.min(minOtH, remaining, params.maxOtPerDayHours) : 1;
      const hi = Math.min(params.maxOtPerDayHours, remaining, canAddInPeriod);
      if (lo > hi) { idx++; continue; }

      const amount = lo + Math.random() * (hi - lo);
      const rounded = Math.round(amount * 4) / 4;
      result[idx] = rounded;
      remaining -= rounded;
      periodOT.set(pid2, usedInPeriod + rounded);
    }
    idx++;
  }

  // Fallback: nếu còn remaining (tất cả period đã đầy QT9), phân bổ tiếp bỏ qua giới hạn period
  if (remaining > 0) {
    idx = params.otStartFromDay - 1;
    while (remaining > 0 && idx < result.length) {
      if (result[idx] === 0) {
        const add = Math.min(params.maxOtPerDayHours, remaining);
        result[idx] = (result[idx] > 0 ? result[idx] : 0) + add;
        remaining -= add;
      }
      idx++;
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

/* ══════════════════════════════════════════════════════
   Step functions — mỗi bước có thể gọi độc lập
   ══════════════════════════════════════════════════════ */

/**
 * Đảm bảo LP (1) và PN (2) chỉ nằm trong daysInMonth ô đầu.
 * Nếu có LP/PN ở padded positions (>= daysInMonth), swap với X (0) trong tháng.
 * LP swap vào X bất kỳ, PN swap vào X sau LP cuối (giữ đúng rule PN sau ngày nghỉ).
 * Mục đích: tháng < 31 ngày không bị mất LP breaker, X tràn ra padded day thì vô hại.
 */
function ensureLPPNWithinMonth(arr: number[], daysInMonth: number): number[] {
  if (daysInMonth >= 31) return arr;
  const result = [...arr];

  // Step 1: swap LP (1) từ padded vào X bất kỳ trong tháng
  for (let i = daysInMonth; i < 31; i++) {
    if (result[i] !== 1) continue;
    for (let j = 0; j < daysInMonth; j++) {
      if (result[j] === 0) { result[j] = 1; result[i] = 0; break; }
    }
  }

  // Step 2: tìm LP cuối trong tháng (sau step 1)
  let lastLP = -1;
  for (let i = daysInMonth - 1; i >= 0; i--) {
    if (result[i] === 1) { lastLP = i; break; }
  }

  // Step 3: swap PN (2) từ padded vào X sau LP cuối
  for (let i = daysInMonth; i < 31; i++) {
    if (result[i] !== 2) continue;
    let swapped = false;
    for (let j = Math.max(0, lastLP + 1); j < daysInMonth; j++) {
      if (result[j] === 0) { result[j] = 2; result[i] = 0; swapped = true; break; }
    }
    if (!swapped) {
      for (let j = 0; j < daysInMonth; j++) {
        if (result[j] === 0) { result[j] = 2; result[i] = 0; break; }
      }
    }
  }

  return result;
}

/** Step 1 — Sinh arrangement (day_type)
 *  Thiết kế theo Python gốc generate_random_arrangement:
 *  - workdays >= threshold: ones=4, zeros=26 cứng, fixedArray toàn 0
 *  - workdays < threshold: ones=4, zeros=26 cứng, dùng inputArray thực tế
 *  - PN đặt ngẫu nhiên trong backtracking (pos >= pnStartFromDay)
 *  - Kế toán: dùng generateCalendarArray
 */
export function step1_generateArrangement(
  emp: EmployeeInput,
  daysInMonth: number,
  month: number,
  year: number,
  params: AllocParams,
  isAccountingDept: boolean,
  algo: 'backtracking' | 'greedy' = 'backtracking',
  symbolMap?: Record<string, number>,
): number[] {
  const workdays = emp.workdays !== '' && emp.workdays !== null && emp.workdays !== undefined
    ? (parseFloat(String(emp.workdays)) || 0)
    : 27;

  // Python: luôn dùng 31 ô, pad 0 nếu tháng ngắn hơn
  const inputArray = encodeInputArray(emp.days, symbolMap); // length 31

  if (isAccountingDept) return generateCalendarArray(month, year, inputArray.slice(0, daysInMonth), params);

  // Trường hợp workdays = 0: NV nghỉ toàn bộ tháng → giữ nguyên inputArray (NL, Ô, TS...), phần còn lại là LP
  if (workdays === 0) {
    const arr = inputArray.slice(0, 31);
    for (let i = 0; i < 31; i++) {
      if (arr[i] === 0) arr[i] = 1; // X → LP, giữ nguyên NL/Ô/TS/PN...
    }
    return arr;
  }

  const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));

  // Số Giới hạn ngày làm liên tục cuối tháng trước (để tránh vi phạm consecutive xuyên tháng)
  const initialLastZeros = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);

  // Luôn dùng 31 positions cho backtracking (giống Python gốc)
  // Giúp tháng ngắn (28-30 ngày) có thêm free slot để đặt breaker LP/PN,
  // tránh bất khả thi khi initialLastZeros cao + workdays lớn.
  const totalDays = 31;
  const fixedArray = inputArray.slice(0, totalDays);
  if (workdays >= params.workdaysThreshold) {
    // Giữ nguyên ngày cố định (NL, Ô, TS, PN...), chỉ reset X và LP về 0
    for (let i = 0; i < totalDays; i++) {
      if (fixedArray[i] <= 1) fixedArray[i] = 0;
    }
  }

  // Đếm số free slots thực tế (ô = 0 sau khi đã reset fixed)
  // workdays trong input = số ngày X thuần (không tính NL/Ô/TS/LP Chủ Nhật)
  const freeSlots = fixedArray.filter(v => v === 0).length;
  const normalizedWd = parseFloat(emp.workdays) || workdays;

  let arrangement: number[] | null = null;

  if (algo === 'greedy') {
    // Greedy: dùng targetLP riêng (không đặt PN trong backtracking)
    // PN thay thế X sau LP cuối, không cần +phepNam (không đặt PN từ LP như cũ)
    const targetLP = Math.max(0, freeSlots - Math.round(normalizedWd));
    arrangement = generateOneArrangementGreedy(fixedArray, params, targetLP, initialLastZeros);
    if (!arrangement) arrangement = fixedArray;
    if (phepNam > 0)
      arrangement = placePNAtEndOfRestPeriod(arrangement, daysInMonth, params, phepNam);
  } else {
    // Backtracking — PN đặt inline (giống Python gốc generate_random_arrangement)
    const workdaysVal = Math.round(normalizedWd);
    const pnCount = Math.min(Math.max(0, phepNam), freeSlots);
    let ZEROS = Math.max(0, workdaysVal - pnCount);        // X = workdays - PN
    let ONES = freeSlots - ZEROS - pnCount;                // LP = freeSlots - X - PN

    arrangement = generateOneArrangement(0, ONES, ZEROS, pnCount, initialLastZeros, fixedArray, [], params);
    for (let extra = 1; !arrangement && extra <= 5; extra++) {
      ONES = ONES + 1;
      ZEROS = freeSlots - ONES - pnCount;
      if (ZEROS < 0) break;
      arrangement = generateOneArrangement(0, ONES, ZEROS, pnCount, initialLastZeros, fixedArray, [], params);
    }
    if (!arrangement) arrangement = fixedArray;
    // PN đã được đặt trong backtracking — không cần placePNAtEndOfRestPeriod
  }

  if (arrangement) arrangement = ensureLPPNWithinMonth(arrangement, daysInMonth);
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
): DayResult[] {
  const workdays    = parseFloat(emp.workdays)      || 27;
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

  let arrangement: number[];
  if (isAccountingDept) {
    arrangement = generateCalendarArray(month, year, inputArray, params);
  } else {
    const freeSlots = fixedArray.filter(v => v === 0).length;
    const workdaysVal = Math.round(workdays);
    const pnCount = Math.min(Math.max(0, phepNam), freeSlots);
    let ZEROS = Math.max(0, workdaysVal - pnCount);
    let ONES = freeSlots - ZEROS - pnCount;

    arrangement = generateOneArrangement(0, ONES, ZEROS, pnCount, initialLastZeros, fixedArray, [], params);
    for (let extra = 1; !arrangement && extra <= 5; extra++) {
      ONES = ONES + 1;
      ZEROS = freeSlots - ONES - pnCount;
      if (ZEROS < 0) break;
      arrangement = generateOneArrangement(0, ONES, ZEROS, pnCount, initialLastZeros, fixedArray, [], params);
    }
    if (!arrangement) arrangement = fixedArray;
    // PN đã được đặt trong backtracking
  }
  arrangement = ensureLPPNWithinMonth(arrangement, daysInMonth);
  const otArray   = otHours    > 0 ? distributeOT(arrangement, otHours, params)       : arrangement.map(v => v !== 0 ? -1 : 0);
  const lateArray = lateMinutes > 0 ? distributeLate(arrangement, lateMinutes, params) : arrangement.map(v => v !== 0 ? -1 : 0);
  return generateDayResults(daysInMonth, arrangement, otArray, lateArray, shift1, shift2, groupWorkHours, params);
}
