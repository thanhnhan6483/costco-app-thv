# 📊 Phân Tích Tham Số Giải Thuật Greedy - Bước 2

## 🎯 Tổng Quan

Giải thuật **Greedy** ở Bước 2 sử dụng **4 tham số chính** từ `alloc_rules` để phân bổ ngày công (X/LP/PN).

---

## 📋 Danh Sách Tham Số Được Sử Dụng

### 1️⃣ **max_consecutive_days** (QT1)
- **Nhóm**: `WORK_RULE`
- **Tên**: Số ngày làm liên tục tối đa
- **Param Key**: `max_consecutive_days`
- **Giá trị mặc định**: `6`
- **Đơn vị**: Ngày
- **Mục đích**: 
  - Giới hạn số ngày làm (X) liên tiếp tối đa
  - Đảm bảo nhân viên không làm quá 6 ngày liên tục
  - Áp dụng cả xuyên tháng (dùng `ngayNghiCuoiThangTruoc`)

**Cách sử dụng trong Greedy:**
```typescript
// Bước 1: Xác định vị trí LP bắt buộc
let run = initialLastZeros; // Số ngày làm cuối tháng trước
for (let i = 0; i < total; i++) {
  if (arr[i] === 0) {
    run++;
    if (run > max && freeSet.has(i)) {
      mustLP.add(i); // Vị trí này BẮT BUỘC phải là LP
      run = 0;
    }
  } else {
    run = 0;
  }
}

// Bước 3: Sửa vi phạm còn sót bằng swap
if (run > max) {
  const insertPos = i - max; // Chèn LP vào đầu đoạn vi phạm
  // Swap với LP khác để giữ tổng LP không đổi
}
```

---

### 2️⃣ **pn_start_from_day** (QT2)
- **Nhóm**: `WORK_RULE`
- **Tên**: PN bắt đầu từ ngày
- **Param Key**: `pn_start_from_day`
- **Giá trị mặc định**: `15`
- **Đơn vị**: Ngày trong tháng
- **Mục đích**: 
  - PN (Phép năm) chỉ được đặt từ ngày 15 trở đi
  - Đảm bảo PN rơi vào cuối kỳ nghỉ (sau chuỗi LP)

**Cách sử dụng trong Greedy:**
```typescript
// Hàm placePNAtEndOfRestPeriod
const startIdx = params.pnStartFromDay - 1; // 0-based = 14

// Tìm chuỗi LP dài nhất từ ngày 15 trở đi
for (let i = startIdx; i < daysInMonth; i++) {
  if (arr[i] === 1) { // LP
    // Ghi nhận run
  }
}

// Đặt PN vào ngày CUỐI của chuỗi LP dài nhất
arr[targetIdx] = 2; // LP → PN
```

---

### 3️⃣ **workdaysThreshold** (hardcode)
- **Nhóm**: `WORK_RULE` (không lưu DB, hardcode trong code)
- **Tên**: Ngưỡng workdays để reset input
- **Giá trị**: `27` (hardcode)
- **Đơn vị**: Ngày
- **Mục đích**: 
  - Nếu `workdays >= 27`: Reset toàn bộ X/LP về 0, chỉ giữ ngày fixed (NL, Ô, TS...)
  - Nếu `workdays < 27`: Giữ nguyên input array (có ngày đặc biệt)

**Cách sử dụng trong Greedy:**
```typescript
// Trong step1_generateArrangement
const fixedArray = inputArray.slice(0, totalDays);
if (workdays >= params.workdaysThreshold) { // >= 27
  // Reset X và LP về 0, giữ nguyên NL/Ô/TS/PN
  for (let i = 0; i < totalDays; i++) {
    if (fixedArray[i] <= 1) fixedArray[i] = 0;
  }
}
```

---

### 4️⃣ **max_day_off_difference** (QT4)
- **Nhóm**: `SHIFT_BALANCING_RULE`
- **Tên**: Chênh lệch ngày nghỉ tối đa trong phòng
- **Param Key**: `max_day_off_difference`
- **Giá trị mặc định**: `1`
- **Đơn vị**: Ngày
- **Mục đích**: 
  - Cân bằng số ngày nghỉ (LP) giữa các nhân viên trong cùng phòng
  - LP count chênh lệch ≤ ±1 ngày

**Cách sử dụng trong Greedy:**
```typescript
// Trong API step/2/route.ts - TRƯỚC khi gọi worker

// 1. Nhóm workdays theo departmentId
const deptWorkdays = new Map<string, number[]>();
for (const emp of emps) {
  const wd = parseFloat(emp.workdays) || 27;
  deptWorkdays.get(deptId).push(wd);
}

// 2. Tính median workdays mỗi phòng
const median = sorted[mid]; // Giá trị trung vị

// 3. Clamp workdays = median ± maxDayOffDifference
const target = deptTarget.get(deptId);
const diff = params.maxDayOffDifference; // = 1
clampedWorkdays.set(emp.id, 
  Math.max(target - diff, Math.min(target + diff, wd))
);

// 4. Truyền _normalizedWorkdays vào worker
empInput._normalizedWorkdays = String(clampedWorkdays.get(emp.id));
```

**Ví dụ:**
- Phòng A có 5 NV: workdays = [26, 27, 27, 28, 30]
- Median = 27
- Clamp với diff=1:
  - 26 → 26 (trong khoảng 26-28)
  - 27 → 27
  - 28 → 28
  - 30 → 28 (vượt max, clamp về 28)
- Kết quả: LP count chênh lệch tối đa 1 ngày

---

## 🔢 Công Thức Tính targetLP

```typescript
// Trong step1_generateArrangement

// 1. Đếm free slots (ô = 0 sau khi đã mark Sundays + giữ fixed)
const freeSlots = fixedArray.filter(v => v === 0).length;

// 2. Lấy workdays đã normalize (từ API)
const normalizedWd = parseFloat(emp._normalizedWorkdays ?? emp.workdays);

// 3. Tính targetLP
const targetLP = Math.max(0, freeSlots - normalizedWd + phepNam);
```

**Giải thích:**
- `freeSlots`: Số ô trống có thể đặt X hoặc LP
- `normalizedWd`: Số ngày làm (X) cần đặt (đã cân bằng theo phòng)
- `phepNam`: Số ngày PN (sẽ thay thế LP, nên cần trừ ra)
- `targetLP`: Số ngày LP cần đặt vào free slots

**Ví dụ:**
- Tháng 1/2026: 31 ngày
- Chủ Nhật: 5 ngày (đã mark LP)
- Fixed (NL): 1 ngày
- Free slots: 31 - 5 - 1 = 25
- normalizedWd: 27
- phepNam: 1
- targetLP = 25 - 27 + 1 = **-1** → clamp về **0**

→ Trường hợp này không đủ slot để đặt LP, toàn bộ free slots sẽ là X

---

## 🚫 Tham Số KHÔNG Được Sử Dụng Ở Bước 2

Các tham số sau thuộc **Bước 3, 4, 5** (OT, Trễ, Ca):

### ❌ Không dùng ở Bước 2:
1. **min_ot_per_day_minutes** (QT7) - Bước 4
2. **max_ot_per_day_hours** (QT6) - Bước 4
3. **ot_distribution_start_day** (QT6) - Bước 4
4. **max_ot_between_rest_hours** (QT9) - Bước 4
5. **max_ot_balance_diff_minutes** (QT8) - Bước 4
6. **max_late_per_day_minutes** (QT10) - Bước 4
7. **late_distribution_start_day** (QT10) - Bước 4
8. **special_group_work_hour_reduction** (QT11) - Bước 5
9. **skip_equal_rest_dept_codes** (QT4) - Dùng ở API để skip normalize, không dùng trong Greedy

---

## 📊 Tóm Tắt Flow Greedy

```
┌─────────────────────────────────────────────────────────┐
│ INPUT                                                   │
├─────────────────────────────────────────────────────────┤
│ • fixedArray (31 số): NL=7, Ô=3, TS=4, X/LP=0          │
│ • params.maxConsecutiveDays = 6                        │
│ • params.pnStartFromDay = 15                           │
│ • targetLP = 3 (số LP cần đặt)                         │
│ • initialLastZeros = 2 (làm 2 ngày cuối tháng trước)   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ BƯỚC 1: Đánh dấu Chủ Nhật                              │
├─────────────────────────────────────────────────────────┤
│ • Tất cả Chủ Nhật (weekday=0) → LP (code 1)            │
│ • Chỉ đánh dấu ô = 0 (không ghi đè NL/Ô/TS)            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ BƯỚC 2: Xác định vị trí LP bắt buộc                    │
├─────────────────────────────────────────────────────────┤
│ • Mô phỏng chạy qua mảng với initialLastZeros=2        │
│ • Mỗi khi run > maxConsecutiveDays (>6)                │
│   → Đánh dấu vị trí đó là mustLP                       │
│ • Ví dụ: X X X X X X X → vị trí thứ 7 bắt buộc LP      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ BƯỚC 3: Phân bổ LP                                     │
├─────────────────────────────────────────────────────────┤
│ • Ưu tiên đặt LP vào vị trí bắt buộc (mustLP)          │
│ • Nếu chưa đủ targetLP → random từ free slots còn lại  │
│ • Đảm bảo tổng LP = targetLP                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ BƯỚC 4: Sửa vi phạm còn sót (swap)                     │
├─────────────────────────────────────────────────────────┤
│ • Quét lại mảng, tìm run > maxConsecutiveDays          │
│ • Chèn LP vào đầu đoạn vi phạm (insertPos = i - max)   │
│ • Swap với LP khác để giữ tổng LP không đổi            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ BƯỚC 5: Đặt PN vào cuối kỳ nghỉ                        │
├─────────────────────────────────────────────────────────┤
│ • Tìm chuỗi LP dài nhất từ ngày pnStartFromDay (15)    │
│ • Đặt PN vào ngày CUỐI của chuỗi đó (LP → PN)          │
│ • Đảm bảo LP liền trước PN (swap nếu cần)              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ OUTPUT                                                  │
├─────────────────────────────────────────────────────────┤
│ • Mảng 31 số: 0=X, 1=LP, 2=PN, 3=Ô, 7=NL...           │
│ • Không vi phạm maxConsecutiveDays                     │
│ • PN rơi vào cuối kỳ nghỉ, sau ngày 15                 │
│ • Tổng LP = targetLP (đã cân bằng theo phòng)          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Kết Luận

**Giải thuật Greedy ở Bước 2 chỉ sử dụng 4 tham số:**

| # | Tham Số | Giá Trị | Mục Đích |
|---|---------|---------|----------|
| 1 | `max_consecutive_days` | 6 | Giới hạn ngày làm liên tục |
| 2 | `pn_start_from_day` | 15 | PN chỉ đặt từ ngày 15 |
| 3 | `workdaysThreshold` | 27 | Ngưỡng reset input |
| 4 | `max_day_off_difference` | 1 | Cân bằng LP trong phòng |

**Các tham số khác (OT, Trễ, Ca) thuộc Bước 3, 4, 5.**

---

## 📝 Ghi Chú

- Giải thuật Greedy chạy **O(n)** - nhanh hơn Backtracking **O(2^n)**
- Có thể có vi phạm nhỏ khi `targetLP < số vị trí bắt buộc`
- Bước 4 (swap) sửa hầu hết vi phạm còn sót
- Nút "Kiểm tra" và "Sửa" giúp xử lý vi phạm sau khi phân bổ

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0
