"use strict";
/**
 * distributionEngine.ts
 * Port giải thuật từ hr_monthly_attendance_distribution.py
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SYMBOL_MAP = void 0;
exports.calcConsecutiveDays = calcConsecutiveDays;
exports.encodeInputArray = encodeInputArray;
exports.generateOneArrangement = generateOneArrangement;
exports.placePNAtEndOfRestPeriod = placePNAtEndOfRestPeriod;
exports.generateCalendarArray = generateCalendarArray;
exports.distributeOT = distributeOT;
exports.distributeLate = distributeLate;
exports.step1_generateArrangement = step1_generateArrangement;
exports.step4_assignShift = step4_assignShift;
exports.step4_assignShiftsBatch = step4_assignShiftsBatch;
exports.step5_distributeOTLate = step5_distributeOTLate;
exports.step6_generateTime = step6_generateTime;
exports.generateDayResults = generateDayResults;
exports.processEmployee = processEmployee;
/* ── Bảng mã ──────────────────────────────────────── */
exports.DEFAULT_SYMBOL_MAP = {
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
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function randomTime(startHHMM, endHHMM) {
    const [sh, sm] = startHHMM.split(':').map(Number);
    const [eh, em] = endHHMM.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    const r = startM + randInt(0, Math.max(0, endM - startM));
    return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
}
function addMins(hhMM, mins) {
    const [h, m] = hhMM.split(':').map(Number);
    const t = h * 60 + m + Math.round(mins);
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function encodeDay(s, symbolMap) {
    const v = (s ?? '').trim();
    return (symbolMap ?? exports.DEFAULT_SYMBOL_MAP)[v] ?? 0;
}
/** Số Giới hạn ngày làm liên tục cuối tháng trước từ ngày nghỉ cuối */
function calcConsecutiveDays(ngayNghi) {
    if (!ngayNghi)
        return 0;
    const s = ngayNghi.trim().replace(/^["']|["']$/g, '');
    if (!s)
        return 0;
    let d, m, y;
    if (s.includes('/')) {
        const parts = s.split('/').map(Number);
        if (parts.length < 2)
            return 0;
        [d, m, y] = parts;
    }
    else {
        const parts = s.split('T')[0].split(' ')[0].split('-').map(Number);
        if (parts.length < 3)
            return 0;
        [y, m, d] = parts;
    }
    const lastDay = new Date(y, m, 0).getDate();
    return Math.max(0, lastDay - d);
}
/* ── Bước 1: Encode input ────────────────────────── */
function encodeInputArray(days, symbolMap) {
    const arr = Array(31).fill(0);
    for (let i = 0; i < Math.min(days.length, 31); i++) {
        arr[i] = encodeDay(days[i], symbolMap);
    }
    return arr;
}
/**
 * Khôi phục số X nếu backtracking fallback làm thiếu workdays
 * Do retry loop tăng ONES giảm ZEROS → mất 1 X so với expected
 * Tìm LP có thể đổi thành X mà không vi phạm maxConsecutiveDays
 */
function recoverMissingWorkdays(arr, daysInMonth, workdaysVal, phepNam, maxConsecutive, initialLastZeros) {
    const expectedX = workdaysVal - phepNam;
    let actualX = (() => { let c = 0; for (let i = 0; i < daysInMonth; i++)
        if (arr[i] === 0)
            c++; return c; })();
    let shortfall = expectedX - actualX;
    if (shortfall <= 0)
        return arr;
    for (let attempt = 0; attempt < shortfall; attempt++) {
        const lpPositions = [];
        for (let i = 0; i < daysInMonth; i++) {
            if (arr[i] === 1)
                lpPositions.push(i);
        }
        let fixed = false;
        for (const pos of lpPositions) {
            let runBefore = initialLastZeros;
            for (let i = pos - 1; i >= 0 && arr[i] === 0; i--)
                runBefore++;
            let runAfter = 0;
            for (let i = pos + 1; i < daysInMonth && arr[i] === 0; i++)
                runAfter++;
            if (runBefore + 1 + runAfter <= maxConsecutive) {
                arr[pos] = 0;
                fixed = true;
                break;
            }
        }
        if (!fixed)
            break;
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
function calcArrangementParams(fixedArray, daysInMonth, workdays, phepNam = 1, // số ngày PN cần phân bổ
threshold = 27) {
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
function generateOneArrangement(pos, ones, zeros, lastZeros, fixedArray, current, params, daysInMonth) {
    const total = fixedArray.length;
    if (pos === total)
        return current;
    const fixed = fixedArray[pos];
    if (fixed !== 0) {
        return generateOneArrangement(pos + 1, ones, zeros, 0, fixedArray, [...current, fixed], params, daysInMonth);
    }
    const options = [];
    if (ones > 0 && pos < daysInMonth)
        options.push([ones - 1, zeros, 0, 1]); // LP
    if (zeros > 0 && (lastZeros < params.maxConsecutiveDays || pos >= daysInMonth))
        options.push([ones, zeros - 1, lastZeros + 1, 0]); // X
    if (options.length > 1 && Math.random() < 0.5)
        options.reverse();
    for (const [no, nz, nlz, val] of options) {
        const result = generateOneArrangement(pos + 1, no, nz, nlz, fixedArray, [...current, val], params, daysInMonth);
    if (result)
        return result;
    return null;
}
/**
 * Đặt PN vào cuối kỳ nghỉ:
 * Tìm chuỗi ngày LP liên tiếp dài nhất bắt đầu từ pnStartFromDay,
 * lấy ngày CUỐI của chuỗi đó → đổi thành PN (code 2).
 * Nếu không có chuỗi LP nào, lấy ngày LP cuối cùng trong tháng.
 * Nếu hoàn toàn không có LP nào khả dụng, bỏ qua (trường hợp hiếm).
 */
function placePNAtEndOfRestPeriod(arrangement, daysInMonth, params, phepNam = 1) {
    const arr = [...arrangement];
    const startIdx = params.pnStartFromDay - 1;
    // Tìm LP cuối cùng trong toàn tháng (PN bắt buộc sau LP)
    let lastLP = -1;
    for (let i = daysInMonth - 1; i >= 0; i--) {
        if (arr[i] === 1) {
            lastLP = i;
            break;
        }
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
    const afterLP = [];
    for (let i = Math.max(afterBoundary, startIdx); i < daysInMonth; i++) {
        if (arr[i] === 0)
            afterLP.push(i);
    }
    // Pool 2: sau LP + trước pnStartFromDay (fallback khi hết chỗ)
    const beforeFromDay = [];
    for (let i = afterBoundary; i < startIdx; i++) {
        if (arr[i] === 0)
            beforeFromDay.push(i);
    }
    // Pool 3: X từ startIdx trở đi (fallback cuối khi LP ở vị trí cuối tháng)
    const anyX = [];
    for (let i = Math.max(startIdx, afterBoundary); i < daysInMonth; i++) {
        if (arr[i] === 0)
            anyX.push(i);
    }
    for (let pn = 0; pn < phepNam; pn++) {
        let idx = -1;
        if (afterLP.length > 0) {
            const pick = Math.floor(Math.random() * afterLP.length);
            idx = afterLP.splice(pick, 1)[0];
        }
        else if (beforeFromDay.length > 0) {
            const pick = Math.floor(Math.random() * beforeFromDay.length);
            idx = beforeFromDay.splice(pick, 1)[0];
        }
        else if (anyX.length > 0) {
            const pick = Math.floor(Math.random() * anyX.length);
            idx = anyX.splice(pick, 1)[0];
        }
        else if (lastLP >= 0) {
            // Pool 4: không có X sau LP → swap LP cuối với X gần nhất trước nó
            for (let i = lastLP - 1; i >= 0; i--) {
                if (arr[i] === 0) {
                    arr[lastLP] = 0;
                    arr[i] = 1;
                    idx = lastLP;
                    break;
                }
            }
            if (idx < 0)
                break;
        }
        else {
            break;
        }
        arr[idx] = 2;
    }
    return arr;
}
/* ── Bước 2B: generate_calendar_array (Kế Toán) ── */
function generateCalendarArray(month, year, inputArray, params) {
    const arr = [...inputArray];
    while (arr.length < 31)
        arr.push(0);
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
function distributeOT(arrangement, totalHours, params) {
    const result = arrangement.map(v => (v !== 0 ? -1 : 0));
    let remaining = totalHours;
    const minOtH = params.minOtPerDayMinutes > 0 ? params.minOtPerDayMinutes / 60 : 0;
    const maxBetweenH = params.maxOtBetweenRestHours ?? 12;
    // Tính OT tích lũy giữa 2 ngày nghỉ (QT9)
    // Mỗi "kỳ" là chuỗi Giới hạn ngày làm liên tục giữa 2 ngày nghỉ
    // Xây dựng map: index → periodId
    const periodId = new Array(arrangement.length).fill(-1);
    let pid = 0;
    let inWork = false;
    for (let i = 0; i < arrangement.length; i++) {
        if (arrangement[i] === 0) {
            if (!inWork) {
                inWork = true;
                pid++;
            }
            periodId[i] = pid;
        }
        else {
            inWork = false;
        }
    }
    const periodOT = new Map(); // pid → tổng OT đã phân bổ (giờ)
    let idx = params.otStartFromDay - 1;
    while (remaining > 0 && idx < result.length) {
        if (result[idx] === 0) {
            const pid2 = periodId[idx];
            const usedInPeriod = periodOT.get(pid2) ?? 0;
            const canAddInPeriod = Math.max(0, maxBetweenH - usedInPeriod);
            if (canAddInPeriod <= 0) {
                idx++;
                continue;
            }
            const lo = minOtH > 0 ? Math.min(minOtH, remaining, params.maxOtPerDayHours) : 1;
            const hi = Math.min(params.maxOtPerDayHours, remaining, canAddInPeriod);
            if (lo > hi) {
                idx++;
                continue;
            }
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
function distributeLate(arrangement, totalMinutes, params) {
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
/* ══════════════════════════════════════════════════════
   Step functions — mỗi bước có thể gọi độc lập
   ══════════════════════════════════════════════════════ */
/** Step 1 — Sinh arrangement (day_type)
 *  Thiết kế theo Python gốc generate_random_arrangement:
 *  - workdays >= threshold: ones=4, zeros=26 cứng, fixedArray toàn 0
 *  - workdays < threshold: ones=4, zeros=26 cứng, dùng inputArray thực tế
 *  - PN đặt ngẫu nhiên trong backtracking (pos >= pnStartFromDay)
 *  - Kế toán: dùng generateCalendarArray
 */
function step1_generateArrangement(emp, daysInMonth, month, year, params, isAccountingDept, symbolMap) {
    const workdays = emp.workdays !== '' && emp.workdays !== null && emp.workdays !== undefined
        ? (parseFloat(String(emp.workdays)) || 0)
        : 27;
    // Python: luôn dùng 31 ô, pad 0 nếu tháng ngắn hơn
    const inputArray = encodeInputArray(emp.days, symbolMap); // length 31
    const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));
    if (isAccountingDept) {
        let arrangement = generateCalendarArray(month, year, inputArray.slice(0, daysInMonth), params);
        if (phepNam > 0)
            arrangement = placePNAtEndOfRestPeriod(arrangement, daysInMonth, params, phepNam);
        return arrangement;
    }
    // Trường hợp workdays = 0: NV nghỉ toàn bộ tháng → giữ nguyên inputArray (NL, Ô, TS...), phần còn lại là LP
    if (workdays === 0) {
        const arr = inputArray.slice(0, 31);
        for (let i = 0; i < 31; i++) {
            if (arr[i] === 0 && i < daysInMonth)
                arr[i] = 1; // X → LP trong tháng, padded giữ X
        }
        return arr;
    }
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
            if (fixedArray[i] <= 1)
                fixedArray[i] = 0;
        }
    }
    // Đếm số free slots thực tế (ô = 0 sau khi đã reset fixed)
    // workdays trong input = số ngày X thuần (không tính NL/Ô/TS/LP Chủ Nhật)
    const freeSlots = fixedArray.filter(v => v === 0).length;
    const normalizedWd = parseFloat(emp.workdays) || workdays;
    let arrangement = null;
    // Phase 1: LP + X (không PN)
    const workdaysVal = Math.round(normalizedWd);
    const paddedCount = Math.max(0, 31 - daysInMonth);
    // ZEROS gồm X cho workdays + X cho padded
    let ZEROS = Math.max(0, workdaysVal + paddedCount);
    let ONES = Math.max(0, freeSlots - ZEROS);
    // Retry original params nhiều lần (random hóa đường đi) trước khi fallback
    arrangement = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        arrangement = generateOneArrangement(0, ONES, ZEROS, initialLastZeros, fixedArray, [], params, daysInMonth);
        if (arrangement)
            break;
    }
    for (let extra = 1; !arrangement && extra <= 5; extra++) {
        ONES = ONES + 1;
        ZEROS = freeSlots - ONES;
        if (ZEROS < 0)
            break;
        for (let attempt = 0; attempt < 3; attempt++) {
            arrangement = generateOneArrangement(0, ONES, ZEROS, initialLastZeros, fixedArray, [], params, daysInMonth);
            if (arrangement)
                break;
        }
    }
    if (!arrangement)
        arrangement = fixedArray;
    // Phase 2: Đặt PN vào X (dùng placePNAtEndOfRestPeriod đã kiểm chứng)
    if (phepNam > 0) {
        arrangement = placePNAtEndOfRestPeriod(arrangement, daysInMonth, params, phepNam);
    }
    // Phase 3: Khôi phục số X nếu backtracking fallback làm thiếu workdays
    arrangement = recoverMissingWorkdays(arrangement, daysInMonth, workdaysVal, phepNam, params.maxConsecutiveDays, initialLastZeros);
    return arrangement;
}
/** Step 4 — Chia ca cho 1 ngày (dùng khi chỉ có 1 ca) */
function step4_assignShift(dayType, shift1, shift2) {
    if (dayType !== 0)
        return '';
    if (shift1 && shift2)
        return randInt(1, 2) === 1 ? 'C1' : 'C2';
    if (shift1)
        return shift1.shiftType || '';
    return '';
}
/**
 * Step 4 — Chia ca cho toàn bộ ngày làm của 1 NV.
 * Nếu có cả Ca 1 và Ca 2: phân bổ đều 50/50, xen kẽ theo tuần
 * (tuần lẻ Ca 1, tuần chẵn Ca 2, hoặc ngược lại — chọn ngẫu nhiên 1 lần/NV).
 */
function step4_assignShiftsBatch(days, shift1, shift2, isCommonShift = false) {
    if (!shift1 || !shift2) {
        // Chỉ 1 ca → gán tất cả ngày làm cùng ca đó
        const single = shift1 ?? shift2;
        const code = isCommonShift ? 'C' : (single ? (single.shiftType || '') : '');
        return days.map(d => ({ day: d.day, shiftCode: d.dayType === 0 ? code : '' }));
    }
    // Có 2 ca → random mỗi ngày độc lập (theo Python gốc: random.randint(1,2))
    return days.map(d => {
        if (d.dayType !== 0)
            return { day: d.day, shiftCode: '' };
        return { day: d.day, shiftCode: randInt(1, 2) === 1 ? 'C1' : 'C2' };
    });
}
/** Step 5 — Phân phối OT & Trễ cho từng ngày */
function step5_distributeOTLate(arrangement, otHours, lateMinutes, params) {
    const otArr = otHours > 0 ? distributeOT(arrangement, otHours, params) : arrangement.map(v => v !== 0 ? -1 : 0);
    const lateArr = lateMinutes > 0 ? distributeLate(arrangement, lateMinutes, params) : arrangement.map(v => v !== 0 ? -1 : 0);
    return arrangement.map((_, i) => ({
        otH: otArr[i] > 0 ? otArr[i] : 0,
        lateM: lateArr[i] > 0 ? lateArr[i] : 0,
    }));
}
const DEFAULT_SHIFT = {
    departmentId: null, shiftType: '',
    windowStart: '07:05', clockIn: '07:45',
    clockOut: '16:25', windowEnd: '16:40',
};
/** Step 6 — Sinh giờ IN/OUT cho 1 ngày */
function step6_generateTime(dayType, otHours, lateMins, shiftCode, shift1, shift2, groupWorkHours, // null = bình thường; số = giờ làm nhóm ĐT
params) {
    if (dayType === 1)
        return { checkIn: '00:00', checkOut: '00:00' };
    if (dayType === 2)
        return { checkIn: 'PN', checkOut: 'PN' };
    if (dayType !== 0)
        return { checkIn: '', checkOut: '' };
    const shift = (shiftCode === 'C2' && shift2) ? shift2
        : (shiftCode === 'C1' && shift1) ? shift1
            : shift1 ?? shift2 ?? DEFAULT_SHIFT;
    let checkIn = randomTime(shift.windowStart, shift.clockIn);
    let checkOut = randomTime(shift.clockOut, shift.windowEnd);
    if (otHours > 0)
        checkOut = addMins(shift.clockOut, otHours * 60 + randInt(0, 10));
    if (lateMins > 0)
        checkIn = addMins(shift.clockIn, lateMins + 15);
    if (groupWorkHours !== null) {
        const reduction = 8 - groupWorkHours;
        if (reduction > 0)
            checkOut = addMins(checkOut, -reduction * 60);
    }
    return { checkIn, checkOut };
}
/* ── generateDayResults ─────────────────────────── */
function generateDayResults(daysInMonth, arrangement, otArray, lateArray, shift1, shift2, groupWorkHours, params) {
    const results = [];
    const defaultShift = {
        departmentId: null, shiftType: '',
        windowStart: '07:05', clockIn: '07:30',
        clockOut: '16:30', windowEnd: '16:35',
    };
    // Luôn tạo 31 DayResult (giống Python: 31 ô cho mọi tháng)
    // Tháng ngắn (28-30 ngày) sẽ có padded positions ở cuối
    for (let d = 0; d < 31; d++) {
        const dayType = arrangement[d];
        const result = { day: d + 1, dayType, checkIn: '', checkOut: '', shiftCode: '', otHours: 0, lateMins: 0 };
        if (dayType === 0) {
            let useShift;
            let shiftCode = '';
            if (shift1 && shift2) {
                const pick = randInt(1, 2);
                useShift = pick === 1 ? shift1 : shift2;
                shiftCode = pick === 1 ? 'Ca 1' : 'Ca 2';
            }
            else if (shift1) {
                useShift = shift1;
                shiftCode = shift1.shiftType || '';
            }
            else {
                useShift = defaultShift;
            }
            result.shiftCode = shiftCode;
            let checkIn = randomTime(useShift.windowStart, useShift.clockIn);
            let checkOut = randomTime(useShift.clockOut, useShift.windowEnd);
            const ot = otArray[d];
            if (ot > 0 && ot !== -1) {
                checkOut = addMins(useShift.clockOut, ot * 60 + randInt(0, 10));
                result.otHours = ot;
            }
            const late = lateArray[d];
            if (late > 0 && late !== -1) {
                checkIn = addMins(useShift.clockIn, late + 15);
                result.lateMins = late;
            }
            if (groupWorkHours !== null) {
                const r = 8 - groupWorkHours;
                if (r > 0)
                    checkOut = addMins(checkOut, -r * 60);
            }
            result.checkIn = checkIn;
            result.checkOut = checkOut;
        }
        else if (dayType === 1) {
            result.checkIn = '00:00';
            result.checkOut = '00:00';
        }
        else if (dayType === 2) {
            result.checkIn = 'PN';
            result.checkOut = 'PN';
        }
        results.push(result);
    }
    return results;
}
/* ── processEmployee ────────────────────────────── */
function processEmployee(emp, daysInMonth, month, year, params, shift1, shift2, isAccountingDept, groupWorkHours, symbolMap) {
    const workdays = parseFloat(emp.workdays) || 27;
    const otHours = parseFloat(emp.overtimeHours) || 0;
    const lateMinutes = parseFloat(emp.lateMinutes) || 0;
    const phepNam = Math.max(0, Math.round(parseFloat(emp.phepNam) || 0));
    const inputArray = encodeInputArray(emp.days, symbolMap);
    const initialLastZeros = calcConsecutiveDays(emp.ngayNghiCuoiThangTruoc);
    // Xây fixedArray giống step1_generateArrangement (luôn 31 positions)
    const totalDays = 31;
    const fixedArray = inputArray.slice(0, totalDays);
    if (workdays >= params.workdaysThreshold) {
        for (let i = 0; i < totalDays; i++) {
            if (fixedArray[i] <= 1)
                fixedArray[i] = 0;
        }
    }
    let arrangement;
    if (isAccountingDept) {
        arrangement = generateCalendarArray(month, year, inputArray, params);
        if (phepNam > 0)
            arrangement = placePNAtEndOfRestPeriod(arrangement, daysInMonth, params, phepNam);
    }
    else {
        const freeSlots = fixedArray.filter(v => v === 0).length;
        const workdaysVal = Math.round(workdays);
        const paddedCount = Math.max(0, 31 - daysInMonth);
        let ZEROS = Math.max(0, workdaysVal + paddedCount);
        let ONES = Math.max(0, freeSlots - ZEROS);
        arrangement = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            arrangement = generateOneArrangement(0, ONES, ZEROS, initialLastZeros, fixedArray, [], params, daysInMonth);
            if (arrangement)
                break;
        }
        for (let extra = 1; !arrangement && extra <= 5; extra++) {
            ONES = ONES + 1;
            ZEROS = freeSlots - ONES;
            if (ZEROS < 0)
                break;
            for (let attempt = 0; attempt < 3; attempt++) {
                arrangement = generateOneArrangement(0, ONES, ZEROS, initialLastZeros, fixedArray, [], params, daysInMonth);
                if (arrangement)
                    break;
            }
        }
        if (!arrangement)
            arrangement = fixedArray;
        if (phepNam > 0) {
            arrangement = placePNAtEndOfRestPeriod(arrangement, daysInMonth, params, phepNam);
        }
        arrangement = recoverMissingWorkdays(arrangement, daysInMonth, workdaysVal, phepNam, params.maxConsecutiveDays, initialLastZeros);
    }
    const otArray = otHours > 0 ? distributeOT(arrangement, otHours, params) : arrangement.map(v => v !== 0 ? -1 : 0);
    const lateArray = lateMinutes > 0 ? distributeLate(arrangement, lateMinutes, params) : arrangement.map(v => v !== 0 ? -1 : 0);
    return generateDayResults(daysInMonth, arrangement, otArray, lateArray, shift1, shift2, groupWorkHours, params);
}
