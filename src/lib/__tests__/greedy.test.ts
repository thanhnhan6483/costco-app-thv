/**
 * Unit test cho giải thuật Greedy (generateOneArrangementGreedy + step1_generateArrangement)
 * Chạy: npx tsx src/lib/__tests__/greedy.test.ts
 *
 * Không cần test framework — dùng Node.js assert thuần.
 */
import assert from 'assert';
import {
  generateOneArrangementGreedy,
  placePNAtEndOfRestPeriod,
  step1_generateArrangement,
  encodeInputArray,
} from '../distributionEngine';
import type { AllocParams, EmployeeInput } from '../distributionEngine';

/* ── Params mặc định ── */
const DEFAULT_PARAMS: AllocParams = {
  maxConsecutiveDays: 6,
  workdaysThreshold: 27,
  pnStartFromDay: 15,
  maxOtPerDayHours: 4,
  minOtPerDayMinutes: 60,
  otStartFromDay: 15,
  maxOtBetweenRestHours: 12,
  maxOtBalanceDiffMinutes: 30,
  maxLatePerDayMinutes: 9,
  lateStartFromDay: 15,
  specialGroupHourReduction: 1,
  skipEqualRestDeptCodes: ['BGD'],
  maxDayOffDifference: 1,
};

/* ── Helpers ── */
function countType(arr: number[], type: number) {
  return arr.filter(v => v === type).length;
}
function maxConsecutive(arr: number[], type: number): number {
  let max = 0, run = 0;
  for (const v of arr) {
    if (v === type) { run++; max = Math.max(max, run); }
    else run = 0;
  }
  return max;
}
function maxConsecutiveFromStart(arr: number[], type: number, initialRun: number): number {
  let max = initialRun, run = initialRun;
  for (const v of arr) {
    if (v === type) { run++; max = Math.max(max, run); }
    else run = 0;
  }
  return max;
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    failed++;
  }
}

/* ════════════════════════════════════════════════════
   NHÓM 1: generateOneArrangementGreedy
   ════════════════════════════════════════════════════ */
console.log('\n📋 Nhóm 1: generateOneArrangementGreedy\n');

test('Tổng ô = daysInMonth (31 ngày)', () => {
  const fixed = Array(31).fill(0);
  const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 4);
  assert.strictEqual(result.length, 31, `length=${result.length}`);
});

test('Số LP đặt đúng targetLP=4', () => {
  // Chạy 20 lần để tránh may rủi
  for (let i = 0; i < 20; i++) {
    const fixed = Array(31).fill(0);
    const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 4);
    const lp = countType(result, 1);
    assert.strictEqual(lp, 4, `LP count=${lp}, expected 4`);
  }
});

test('Số LP đặt đúng targetLP=3 (tháng 30 ngày)', () => {
  for (let i = 0; i < 20; i++) {
    const fixed = Array(30).fill(0);
    const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 3);
    const lp = countType(result, 1);
    assert.strictEqual(lp, 3, `LP count=${lp}, expected 3`);
  }
});

test('maxConsecutiveDays không bị vi phạm (không có initialLastZeros)', () => {
  for (let i = 0; i < 50; i++) {
    const fixed = Array(31).fill(0);
    const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 4);
    const maxRun = maxConsecutive(result, 0);
    assert.ok(maxRun <= DEFAULT_PARAMS.maxConsecutiveDays,
      `maxRun=${maxRun} > ${DEFAULT_PARAMS.maxConsecutiveDays}`);
  }
});

test('maxConsecutiveDays không bị vi phạm với initialLastZeros=5', () => {
  // NV làm 5 ngày cuối tháng trước → chỉ được làm thêm 1 ngày đầu tháng này
  for (let i = 0; i < 50; i++) {
    const fixed = Array(31).fill(0);
    const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 4, 5);
    const maxRun = maxConsecutiveFromStart(result, 0, 5);
    assert.ok(maxRun <= DEFAULT_PARAMS.maxConsecutiveDays,
      `maxRun xuyên tháng=${maxRun} > ${DEFAULT_PARAMS.maxConsecutiveDays}`);
  }
});

test('initialLastZeros=6 → ngày đầu tiên phải là LP (không được làm thêm)', () => {
  // Đã làm đúng 6 ngày liên tiếp → ngày đầu tháng phải nghỉ
  let firstDayIsWork = 0;
  for (let i = 0; i < 30; i++) {
    const fixed = Array(31).fill(0);
    const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 4, 6);
    if (result[0] === 0) firstDayIsWork++;
  }
  assert.strictEqual(firstDayIsWork, 0,
    `Ngày đầu tháng vẫn là X trong ${firstDayIsWork}/30 lần khi initialLastZeros=6`);
});

test('Ngày fixed (NL=7) được giữ nguyên, không bị ghi đè', () => {
  const fixed = Array(31).fill(0);
  fixed[6] = 7;  // ngày 7 là NL
  fixed[13] = 7; // ngày 14 là NL
  for (let i = 0; i < 20; i++) {
    const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 4);
    assert.strictEqual(result[6], 7, `Ngày 7 bị ghi đè: ${result[6]}`);
    assert.strictEqual(result[13], 7, `Ngày 14 bị ghi đè: ${result[13]}`);
  }
});

test('targetLP=0 → không có LP nào được đặt', () => {
  const fixed = Array(31).fill(0);
  const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 0);
  const lp = countType(result, 1);
  assert.strictEqual(lp, 0, `LP count=${lp}, expected 0`);
});

test('targetLP lớn hơn freeSlots → clamp về freeSlots', () => {
  const fixed = Array(31).fill(0);
  // Chỉ có 5 free slots
  for (let i = 5; i < 31; i++) fixed[i] = 7; // NL
  const result = generateOneArrangementGreedy(fixed, DEFAULT_PARAMS, 99);
  const lp = countType(result, 1);
  assert.ok(lp <= 5, `LP count=${lp} > freeSlots=5`);
});

/* ════════════════════════════════════════════════════
   NHÓM 2: targetLP tính đúng khi có ngày fixed non-work
   ════════════════════════════════════════════════════ */
console.log('\n📋 Nhóm 2: targetLP với ngày fixed non-work (NL/Ô/TS)\n');

test('NV có 2 ngày NL: số ngày làm = workdays', () => {
  // workdays=27, phepNam=1, 2 ngày NL → targetLP = 31-27-1-2 = 1
  const days = Array(31).fill('');
  days[0] = 'NL'; days[30] = 'NL'; // ngày 1 và 31 là NL
  const emp: EmployeeInput & { _normalizedWorkdays: string } = {
    id: 'e1', departmentId: 'd1', specialGroup: '', groupCodeEndDate: '',
    ngayNghiCuoiThangTruoc: '', workdays: '27', overtimeHours: '0',
    lateMinutes: '0', phepNam: '1', days,
    _normalizedWorkdays: '27',
  };
  for (let i = 0; i < 20; i++) {
    const arr = step1_generateArrangement(emp, 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    const workCount = countType(arr, 0); // X = làm
    const pnCount = countType(arr, 2);   // PN
    const nlCount = countType(arr, 7);   // NL
    // Tổng ngày công = X + PN = workdays = 27
    assert.strictEqual(workCount + pnCount, 27,
      `workCount+PN=${workCount + pnCount}, expected 27 (X=${workCount}, PN=${pnCount}, NL=${nlCount})`);
  }
});

test('NV có 3 ngày Ô (ốm): số ngày làm = workdays', () => {
  // workdays=25, phepNam=0, 3 ngày Ô → targetLP = 31-25-0-3 = 3
  const days = Array(31).fill('');
  days[0] = 'Ô'; days[1] = 'Ô'; days[2] = 'Ô';
  const emp: EmployeeInput & { _normalizedWorkdays: string } = {
    id: 'e2', departmentId: 'd1', specialGroup: '', groupCodeEndDate: '',
    ngayNghiCuoiThangTruoc: '', workdays: '25', overtimeHours: '0',
    lateMinutes: '0', phepNam: '0', days,
    _normalizedWorkdays: '25',
  };
  for (let i = 0; i < 20; i++) {
    const arr = step1_generateArrangement(emp, 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    const workCount = countType(arr, 0);
    assert.strictEqual(workCount, 25,
      `workCount=${workCount}, expected 25`);
  }
});

/* ════════════════════════════════════════════════════
   NHÓM 3: placePNAtEndOfRestPeriod
   ════════════════════════════════════════════════════ */
console.log('\n📋 Nhóm 3: placePNAtEndOfRestPeriod\n');

test('PN được đặt từ ngày pnStartFromDay trở đi', () => {
  for (let i = 0; i < 30; i++) {
    const arr = Array(31).fill(0);
    // Đặt vài LP sau ngày 15
    arr[15] = 1; arr[16] = 1; arr[20] = 1;
    const result = placePNAtEndOfRestPeriod(arr, 31, DEFAULT_PARAMS, 1);
    const pnDays = result.map((v, idx) => v === 2 ? idx + 1 : -1).filter(d => d > 0);
    assert.ok(pnDays.length === 1, `Số PN=${pnDays.length}, expected 1`);
    assert.ok(pnDays[0] >= DEFAULT_PARAMS.pnStartFromDay,
      `PN tại ngày ${pnDays[0]} < pnStartFromDay=${DEFAULT_PARAMS.pnStartFromDay}`);
  }
});

test('PN đặt vào cuối chuỗi LP dài nhất', () => {
  // Chuỗi LP: ngày 16-17 (dài 2) và ngày 20-22 (dài 3) → PN phải ở ngày 22
  const arr = Array(31).fill(0);
  arr[15] = 1; arr[16] = 1;           // LP ngày 16-17
  arr[19] = 1; arr[20] = 1; arr[21] = 1; // LP ngày 20-22
  const result = placePNAtEndOfRestPeriod(arr, 31, DEFAULT_PARAMS, 1);
  const pnIdx = result.indexOf(2);
  assert.strictEqual(pnIdx, 21, `PN tại index ${pnIdx} (ngày ${pnIdx + 1}), expected index 21 (ngày 22)`);
});

test('Số PN sau khi đặt Phân bổ PN = Phép năm', () => {
  for (let i = 0; i < 20; i++) {
    const arr = Array(31).fill(0);
    // Đặt nhiều LP để có chỗ cho 2 PN
    for (let d = 14; d < 31; d += 3) arr[d] = 1;
    const result = placePNAtEndOfRestPeriod(arr, 31, DEFAULT_PARAMS, 2);
    const pnCount = countType(result, 2);
    assert.strictEqual(pnCount, 2, `PN count=${pnCount}, expected 2`);
  }
});

/* ════════════════════════════════════════════════════
   NHÓM 4: step1_generateArrangement end-to-end
   ════════════════════════════════════════════════════ */
console.log('\n📋 Nhóm 4: step1_generateArrangement end-to-end\n');

function makeEmp(overrides: Partial<EmployeeInput & { _normalizedWorkdays: string }> = {}): EmployeeInput & { _normalizedWorkdays: string } {
  return {
    id: 'e1', departmentId: 'd1', specialGroup: '', groupCodeEndDate: '',
    ngayNghiCuoiThangTruoc: '', workdays: '27', overtimeHours: '0',
    lateMinutes: '0', phepNam: '1', days: Array(31).fill(''),
    _normalizedWorkdays: '27',
    ...overrides,
  };
}

test('Tổng ngày = daysInMonth', () => {
  for (let i = 0; i < 20; i++) {
    const arr = step1_generateArrangement(makeEmp(), 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    assert.strictEqual(arr.length, 31, `length=${arr.length}`);
  }
});

test('Số ngày làm (X) + PN = workdays=27', () => {
  for (let i = 0; i < 30; i++) {
    const arr = step1_generateArrangement(makeEmp(), 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    const x = countType(arr, 0);
    const pn = countType(arr, 2);
    assert.strictEqual(x + pn, 27, `X+PN=${x + pn}, expected 27 (X=${x}, PN=${pn})`);
  }
});

test('Số PN Phân bổ PN = Phép năm=1', () => {
  for (let i = 0; i < 30; i++) {
    const arr = step1_generateArrangement(makeEmp(), 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    const pn = countType(arr, 2);
    assert.strictEqual(pn, 1, `PN=${pn}, expected 1`);
  }
});

test('PN không trước ngày pnStartFromDay=15', () => {
  for (let i = 0; i < 30; i++) {
    const arr = step1_generateArrangement(makeEmp(), 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    const pnDays = arr.map((v, idx) => v === 2 ? idx + 1 : -1).filter(d => d > 0);
    for (const d of pnDays) {
      assert.ok(d >= DEFAULT_PARAMS.pnStartFromDay,
        `PN tại ngày ${d} < pnStartFromDay=${DEFAULT_PARAMS.pnStartFromDay}`);
    }
  }
});

test('maxConsecutiveDays không bị vi phạm', () => {
  for (let i = 0; i < 50; i++) {
    const arr = step1_generateArrangement(makeEmp(), 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    const maxRun = maxConsecutive(arr, 0);
    assert.ok(maxRun <= DEFAULT_PARAMS.maxConsecutiveDays,
      `maxRun=${maxRun} > ${DEFAULT_PARAMS.maxConsecutiveDays}`);
  }
});

test('maxConsecutiveDays không vi phạm xuyên tháng (ngayNghiCuoiThangTruoc)', () => {
  // NV nghỉ ngày 25/12/2025 → làm 6 ngày cuối tháng 12 (26-31)
  const emp = makeEmp({ ngayNghiCuoiThangTruoc: '25/12/2025' });
  for (let i = 0; i < 50; i++) {
    const arr = step1_generateArrangement(emp, 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    // initialLastZeros = 31 - 25 = 6 → ngày đầu tháng 1 không được làm
    const maxRun = maxConsecutiveFromStart(arr, 0, 6);
    assert.ok(maxRun <= DEFAULT_PARAMS.maxConsecutiveDays,
      `maxRun xuyên tháng=${maxRun} > ${DEFAULT_PARAMS.maxConsecutiveDays}`);
  }
});

test('workdays=0 → toàn bộ là LP (không có X)', () => {
  const emp = makeEmp({ workdays: '0', _normalizedWorkdays: '0', phepNam: '0' });
  const arr = step1_generateArrangement(emp, 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
  const x = countType(arr, 0);
  assert.strictEqual(x, 0, `X=${x}, expected 0`);
});

test('phepNam=0 → không có PN', () => {
  const emp = makeEmp({ phepNam: '0' });
  for (let i = 0; i < 20; i++) {
    const arr = step1_generateArrangement(emp, 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    const pn = countType(arr, 2);
    assert.strictEqual(pn, 0, `PN=${pn}, expected 0`);
  }
});

test('phepNam=2 → đúng 2 PN, tất cả từ ngày 15 trở đi', () => {
  const emp = makeEmp({ phepNam: '2', workdays: '27', _normalizedWorkdays: '27' });
  for (let i = 0; i < 20; i++) {
    const arr = step1_generateArrangement(emp, 31, 1, 2026, DEFAULT_PARAMS, false, 'greedy');
    const pn = countType(arr, 2);
    assert.strictEqual(pn, 2, `PN=${pn}, expected 2`);
    const pnDays = arr.map((v, idx) => v === 2 ? idx + 1 : -1).filter(d => d > 0);
    for (const d of pnDays) {
      assert.ok(d >= 15, `PN tại ngày ${d} < 15`);
    }
  }
});

test('Tháng 28 ngày (Feb): tổng ngày = 28', () => {
  const emp = makeEmp({ workdays: '24', _normalizedWorkdays: '24' });
  for (let i = 0; i < 20; i++) {
    const arr = step1_generateArrangement(emp, 28, 2, 2026, DEFAULT_PARAMS, false, 'greedy');
    assert.strictEqual(arr.length, 28, `length=${arr.length}`);
    const x = countType(arr, 0);
    const pn = countType(arr, 2);
    assert.strictEqual(x + pn, 24, `X+PN=${x + pn}, expected 24`);
  }
});

/* ════════════════════════════════════════════════════
   KẾT QUẢ
   ════════════════════════════════════════════════════ */
console.log(`\n${'─'.repeat(50)}`);
console.log(`Kết quả: ${passed} passed, ${failed} failed / ${passed + failed} tests`);
if (failed > 0) {
  console.log('\n⚠️  Có test thất bại — cần kiểm tra lại giải thuật.');
  process.exit(1);
} else {
  console.log('\n🎉 Tất cả test đều pass!');
}
