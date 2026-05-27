# 📋 Bước 4 & 5: Phân Bổ Tăng Ca (OT) và Đi Trễ (Late)

## 🎯 Mục Tiêu

**Bước 4:** Phân bổ tăng ca (OT) và đi trễ (Late) cho từng ngày làm của nhân viên

**Bước 5:** Sinh giờ vào/ra (check_in, check_out) dựa trên ca làm việc, OT, và Late

---

## 📊 Tổng Quan

### **Input:**
- `employees`: Danh sách nhân viên với `overtime_hours` và `late_minutes` tổng trong tháng
- `distribution_results`: Kết quả từ Bước 3 (đã có dayType và shift_code)
- `alloc_params`: Các tham số phân bổ (maxOtPerDayHours, minOtPerDayMinutes, otStartFromDay, ...)

### **Output:**
- Cập nhật `ot_hours` và `late_mins` cho từng ngày trong `distribution_results`
- Cập nhật `check_in` và `check_out` cho từng ngày

---

## 🔧 BƯỚC 4: Phân Bổ OT và Late

### **API:** `POST /api/distribution/step/4`

### **Giải Thuật Tổng Thể:**

```typescript
// 1. Load dữ liệu
const emps = await loadEmployees(monthId); // { id, overtimeHours, lateMinutes }
const allDays = await loadDistributionResults(monthId); // { empId, day, dayType }
const params = await loadParams(monthId);

// 2. Với mỗi nhân viên
for (const emp of emps) {
  const arrangement = days.map(d => d.dayType); // [0, 0, 1, 0, 2, ...]
  const otH = parseFloat(emp.overtimeHours) || 0;   // Tổng OT trong tháng (giờ)
  const latM = parseFloat(emp.lateMinutes) || 0;    // Tổng Late trong tháng (phút)
  
  // 3. Phân bổ OT và Late cho từng ngày
  const dist = step5_distributeOTLate(arrangement, otH, latM, params);
  // dist = [{ otH: 2, lateM: 5 }, { otH: 0, lateM: 0 }, ...]
  
  // 4. Lưu vào database
  for (let i = 0; i < days.length; i++) {
    await updateOTLate(emp.id, days[i].day, dist[i].otH, dist[i].lateM);
  }
}

// 5. QT8: Cân bằng OT trong phòng ban (inline)
await balanceOTInDepartments(monthId, params);
```

---

## 📈 Chi Tiết: Phân Bổ OT (distributeOT)

### **Mục đích:**
Phân bổ tổng số giờ OT của nhân viên vào các ngày làm, tuân thủ các ràng buộc:
- **QT6:** OT chỉ phân bổ từ ngày `otStartFromDay` trở đi
- **QT7:** OT tối đa mỗi ngày ≤ `maxOtPerDayHours`
- **QT9:** OT tích lũy giữa 2 ngày nghỉ ≤ `maxOtBetweenRestHours`
- **QT10:** Nếu có OT thì phải ≥ `minOtPerDayMinutes`

### **Giải Thuật:**

```typescript
function distributeOT(
  arrangement: number[],      // [0, 0, 1, 0, 0, 2, ...] (dayType)
  totalHours: number,          // Tổng OT trong tháng (giờ)
  params: AllocParams
): number[] {
  // 1. Khởi tạo kết quả: -1 cho ngày nghỉ, 0 cho ngày làm
  const result: number[] = arrangement.map(v => (v !== 0 ? -1 : 0));
  let remaining = totalHours;
  
  const minOtH = params.minOtPerDayMinutes / 60;  // Chuyển phút → giờ
  const maxBetweenH = params.maxOtBetweenRestHours;
  
  // 2. Xác định "kỳ" (period): Chuỗi ngày làm liên tiếp giữa 2 ngày nghỉ
  // Ví dụ: [0, 0, 1, 0, 0, 0, 1, 0] → period: [1, 1, -, 2, 2, 2, -, 3]
  const periodId: number[] = new Array(arrangement.length).fill(-1);
  let pid = 0;
  let inWork = false;
  for (let i = 0; i < arrangement.length; i++) {
    if (arrangement[i] === 0) {  // Ngày làm
      if (!inWork) { inWork = true; pid++; }
      periodId[i] = pid;
    } else {  // Ngày nghỉ
      inWork = false;
    }
  }
  
  // 3. Đếm OT đã phân bổ cho mỗi period (để kiểm tra QT9)
  const periodOT = new Map<number, number>(); // pid → tổng OT (giờ)
  
  // 4. Phân bổ OT từ ngày otStartFromDay
  let idx = params.otStartFromDay - 1;
  while (remaining > 0 && idx < result.length) {
    if (result[idx] === 0) {  // Ngày làm
      const pid2 = periodId[idx];
      const usedInPeriod = periodOT.get(pid2) ?? 0;
      const canAddInPeriod = Math.max(0, maxBetweenH - usedInPeriod);
      
      // QT9: Nếu period đã đầy → bỏ qua
      if (canAddInPeriod <= 0) { idx++; continue; }
      
      // QT10: Nếu có OT thì phải ≥ minOtH
      const lo = minOtH > 0 ? Math.min(minOtH, remaining, params.maxOtPerDayHours) : 1;
      const hi = Math.min(params.maxOtPerDayHours, remaining, canAddInPeriod);
      
      if (lo > hi) { idx++; continue; }
      
      // Random OT trong khoảng [lo, hi]
      const amount = lo + Math.random() * (hi - lo);
      const rounded = Math.round(amount * 4) / 4;  // Làm tròn 0.25h
      
      result[idx] = rounded;
      remaining -= rounded;
      periodOT.set(pid2, usedInPeriod + rounded);
    }
    idx++;
  }
  
  // 5. Fallback: Nếu còn remaining (tất cả period đã đầy QT9)
  // → Phân bổ tiếp bỏ qua giới hạn period
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
```

### **Ví dụ:**

**Input:**
```
NV001:
- arrangement: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, ...]
                 (X, X, LP, X, X, X, LP, X, X, LP, ...)
- totalHours: 10 giờ
- params:
  - otStartFromDay: 15
  - maxOtPerDayHours: 4
  - minOtPerDayMinutes: 60 (= 1 giờ)
  - maxOtBetweenRestHours: 12
```

**Xác định period:**
```
Day:    1  2  3  4  5  6  7  8  9  10 ...
Type:   0  0  1  0  0  0  1  0  0  1  ...
Period: 1  1  -  2  2  2  -  3  3  -  ...
```

**Phân bổ OT (từ ngày 15):**
```
Giả sử ngày 15-20: [0, 0, 1, 0, 0, 0] (period 5, 5, -, 6, 6, 6)

Ngày 15 (period 5):
- remaining = 10h
- usedInPeriod = 0h
- canAddInPeriod = 12h
- lo = 1h (minOtH), hi = 4h (maxOtPerDayHours)
- random → 2.5h
→ result[15] = 2.5h, remaining = 7.5h, periodOT[5] = 2.5h

Ngày 16 (period 5):
- remaining = 7.5h
- usedInPeriod = 2.5h
- canAddInPeriod = 9.5h
- lo = 1h, hi = 4h
- random → 3.25h
→ result[16] = 3.25h, remaining = 4.25h, periodOT[5] = 5.75h

Ngày 17: LP → bỏ qua

Ngày 18 (period 6):
- remaining = 4.25h
- usedInPeriod = 0h
- canAddInPeriod = 12h
- lo = 1h, hi = 4h
- random → 2.75h
→ result[18] = 2.75h, remaining = 1.5h, periodOT[6] = 2.75h

Ngày 19 (period 6):
- remaining = 1.5h
- usedInPeriod = 2.75h
- canAddInPeriod = 9.25h
- lo = 1h, hi = 1.5h
- random → 1.5h
→ result[19] = 1.5h, remaining = 0h ✅ XONG

Kết quả:
- Ngày 15: 2.5h OT
- Ngày 16: 3.25h OT
- Ngày 18: 2.75h OT
- Ngày 19: 1.5h OT
→ Tổng: 10h ✅
```

---

## 📉 Chi Tiết: Phân Bổ Late (distributeLate)

### **Mục đích:**
Phân bổ tổng số phút đi trễ của nhân viên vào các ngày làm.

### **Giải Thuật:**

```typescript
function distributeLate(
  arrangement: number[],      // [0, 0, 1, 0, 0, 2, ...]
  totalMinutes: number,        // Tổng Late trong tháng (phút)
  params: AllocParams
): number[] {
  // 1. Khởi tạo kết quả: -1 cho ngày nghỉ, 0 cho ngày làm
  const result: number[] = arrangement.map(v => (v !== 0 ? -1 : 0));
  let remaining = totalMinutes;
  
  // 2. Phân bổ Late từ ngày lateStartFromDay
  let idx = params.lateStartFromDay - 1;
  while (remaining > 0 && idx < result.length) {
    if (result[idx] === 0) {  // Ngày làm
      // Random Late trong khoảng [1, maxLatePerDayMinutes]
      const amount = Math.min(
        randInt(1, params.maxLatePerDayMinutes), 
        remaining
      );
      result[idx] = amount;
      remaining -= amount;
    }
    idx++;
  }
  
  return result;
}
```

**Đơn giản hơn OT:**
- Không có ràng buộc period (QT9)
- Không có ràng buộc min (QT10)
- Chỉ có ràng buộc max mỗi ngày (maxLatePerDayMinutes)

### **Ví dụ:**

**Input:**
```
NV001:
- arrangement: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, ...]
- totalMinutes: 50 phút
- params:
  - lateStartFromDay: 15
  - maxLatePerDayMinutes: 9
```

**Phân bổ Late (từ ngày 15):**
```
Ngày 15 (X):
- remaining = 50 phút
- random(1, 9) → 7 phút
→ result[15] = 7, remaining = 43

Ngày 16 (X):
- remaining = 43 phút
- random(1, 9) → 5 phút
→ result[16] = 5, remaining = 38

Ngày 17 (LP): bỏ qua

Ngày 18 (X):
- remaining = 38 phút
- random(1, 9) → 9 phút
→ result[18] = 9, remaining = 29

Ngày 19 (X):
- remaining = 29 phút
- random(1, 9) → 8 phút
→ result[19] = 8, remaining = 21

Ngày 20 (X):
- remaining = 21 phút
- random(1, 9) → 6 phút
→ result[20] = 6, remaining = 15

Ngày 21 (LP): bỏ qua

Ngày 22 (X):
- remaining = 15 phút
- random(1, 9) → 9 phút
→ result[22] = 9, remaining = 6

Ngày 23 (X):
- remaining = 6 phút
- random(1, 6) → 6 phút
→ result[23] = 6, remaining = 0 ✅ XONG

Kết quả:
- Ngày 15: 7 phút
- Ngày 16: 5 phút
- Ngày 18: 9 phút
- Ngày 19: 8 phút
- Ngày 20: 6 phút
- Ngày 22: 9 phút
- Ngày 23: 6 phút
→ Tổng: 50 phút ✅
```

---

## ⚖️ QT8: Cân Bằng OT Trong Phòng Ban

### **Mục đích:**
Đảm bảo OT giữa các NV trong cùng phòng mỗi ngày chênh lệch ≤ `maxOtBalanceDiffMinutes`.

### **Giải Thuật:**

```typescript
// 1. Nhóm NV theo phòng ban
const deptEmpsMap = new Map<string, string[]>(); // deptId → empIds

// 2. Load OT của tất cả NV
const empOTMap = new Map<string, Map<number, { dayType, otHours }>>(); // empId → day → OT

// 3. Với mỗi phòng, mỗi ngày
for (const [deptId, members] of deptEmpsMap) {
  for (let day = 1; day <= daysInMonth; day++) {
    // Lấy danh sách NV làm việc ngày này và có OT
    const otList = members
      .map(id => ({ id, ot: empOTMap.get(id)?.get(day)?.otHours ?? 0 }))
      .filter(m => m.dayType === 0 && m.ot > 0);
    
    if (otList.length < 2) continue; // Ít hơn 2 NV → không cần cân bằng
    
    // Tính chênh lệch
    const maxOt = Math.max(...otList.map(m => m.ot));
    const minOt = Math.min(...otList.map(m => m.ot));
    const maxDiffH = params.maxOtBalanceDiffMinutes / 60;
    
    if (maxOt - minOt <= maxDiffH) continue; // Đã cân bằng
    
    // Cân bằng: Đặt tất cả về trung bình
    const avg = Math.round((otList.reduce((s, m) => s + m.ot, 0) / otList.length) * 4) / 4;
    
    for (const m of otList) {
      if (Math.abs(m.ot - avg) > 0.01) {
        await updateOT(m.id, day, avg);
      }
    }
  }
}
```

### **Ví dụ:**

**Trước cân bằng:**
```
Phòng Sản Xuất - Ngày 15:
- NV001: 4h OT
- NV002: 2h OT
- NV003: 1h OT
→ Chênh: 4 - 1 = 3h > 0.5h (30 phút) ⚠️ VI PHẠM
```

**Sau cân bằng:**
```
Trung bình: (4 + 2 + 1) / 3 = 2.33h

Phòng Sản Xuất - Ngày 15:
- NV001: 2.25h OT (làm tròn 0.25h)
- NV002: 2.25h OT
- NV003: 2.25h OT
→ Chênh: 0h ✅ OK
```

---

## 🔄 BƯỚC 5: Sinh Giờ Vào/Ra

### **API:** `POST /api/distribution/step/5`

### **Mục đích:**
Sinh giờ vào (check_in) và giờ ra (check_out) dựa trên:
- Ca làm việc (shift_code)
- OT (ot_hours)
- Late (late_mins)
- Nhóm đặc thù (special_group) - giảm giờ làm

### **Giải Thuật:**

```typescript
function step6_generateTime(
  dayType: number,
  otHours: number,
  lateMins: number,
  shiftCode: string,
  shift1: ShiftInfo | null,
  shift2: ShiftInfo | null,
  groupWorkHours: number | null,  // Giờ làm của nhóm đặc thù (7h, 6h, ...)
  params: AllocParams
): { checkIn: string; checkOut: string } {
  // 1. Nếu không phải ngày làm → trả về rỗng
  if (dayType !== 0) return { checkIn: '', checkOut: '' };
  
  // 2. Chọn ca làm việc
  const shift = shiftCode === 'C2' && shift2 
    ? shift2 
    : shift1 ?? DEFAULT_SHIFT;
  
  // 3. Sinh giờ vào/ra ngẫu nhiên trong khung giờ
  let checkIn  = randomTime(shift.windowStart, shift.clockIn);
  let checkOut = randomTime(shift.clockOut, shift.windowEnd);
  
  // 4. Điều chỉnh theo OT
  if (otHours > 0) {
    checkOut = addMins(shift.clockOut, otHours * 60 + randInt(0, 10));
  }
  
  // 5. Điều chỉnh theo Late
  if (lateMins > 0) {
    checkIn = addMins(shift.clockIn, lateMins + 15); // +15 buffer
  }
  
  // 6. Điều chỉnh theo nhóm đặc thù (giảm giờ làm)
  if (groupWorkHours !== null) {
    const reduction = 8 - groupWorkHours; // Ví dụ: 8 - 7 = 1h
    if (reduction > 0) {
      checkOut = addMins(checkOut, -reduction * 60); // Giảm giờ ra
    }
  }
  
  return { checkIn, checkOut };
}
```

### **Ví dụ:**

**Trường hợp 1: Ngày làm bình thường**
```
Input:
- dayType: 0 (X)
- shiftCode: 'C1'
- shift1: { windowStart: '07:05', clockIn: '07:45', clockOut: '16:30', windowEnd: '17:00' }
- otHours: 0
- lateMins: 0
- groupWorkHours: null

Output:
- checkIn: randomTime('07:05', '07:45') → '07:23'
- checkOut: randomTime('16:30', '17:00') → '16:47'
```

**Trường hợp 2: Có OT**
```
Input:
- dayType: 0 (X)
- shiftCode: 'C1'
- shift1: { clockOut: '16:30', ... }
- otHours: 2.5
- lateMins: 0

Output:
- checkIn: '07:23'
- checkOut: addMins('16:30', 2.5 * 60 + randInt(0, 10)) 
          = addMins('16:30', 150 + 5) 
          = '19:05'
```

**Trường hợp 3: Có Late**
```
Input:
- dayType: 0 (X)
- shiftCode: 'C1'
- shift1: { clockIn: '07:45', ... }
- otHours: 0
- lateMins: 7

Output:
- checkIn: addMins('07:45', 7 + 15) = addMins('07:45', 22) = '08:07'
- checkOut: '16:47'
```

**Trường hợp 4: Nhóm đặc thù (giảm giờ)**
```
Input:
- dayType: 0 (X)
- shiftCode: 'C1'
- shift1: { clockOut: '16:30', ... }
- otHours: 0
- lateMins: 0
- groupWorkHours: 7 (giảm 1h)

Output:
- checkIn: '07:23'
- checkOut: addMins('16:47', -1 * 60) = '15:47'
```

**Trường hợp 5: Có OT + Late + Nhóm đặc thù**
```
Input:
- dayType: 0 (X)
- shiftCode: 'C1'
- shift1: { clockIn: '07:45', clockOut: '16:30', ... }
- otHours: 2
- lateMins: 5
- groupWorkHours: 7

Output:
- checkIn: addMins('07:45', 5 + 15) = '08:05'
- checkOut: addMins('16:30', 2 * 60 + 5) = '18:35'
           → addMins('18:35', -1 * 60) = '17:35'
```

---

## 🔄 Flow Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│ Bước 3: Chia ca (shift_code)                            │
│ → Kết quả: dayType, shift_code                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 4: Phân bổ OT và Late                              │
│ → distributeOT: Phân bổ OT theo QT6-QT10                │
│ → distributeLate: Phân bổ Late                          │
│ → QT8: Cân bằng OT trong phòng                          │
│ → Kết quả: ot_hours, late_mins                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 5: Sinh giờ vào/ra                                 │
│ → step6_generateTime: Sinh check_in, check_out         │
│ → Xét OT, Late, nhóm đặc thù                            │
│ → Kết quả: check_in, check_out                          │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Ràng Buộc Quan Trọng

### **1. CHỈ phân bổ cho ngày làm (dayType = 0)**
```typescript
if (dayType !== 0) return { checkIn: '', checkOut: '' };
```

### **2. KHÔNG thay đổi dayType**
```typescript
// CHỈ cập nhật ot_hours, late_mins, check_in, check_out
// KHÔNG thay đổi day_type, shift_code
```

### **3. Tuân thủ các quy tắc:**
- **QT6:** OT từ ngày `otStartFromDay`
- **QT7:** OT tối đa/ngày ≤ `maxOtPerDayHours`
- **QT8:** OT cân bằng trong phòng ≤ `maxOtBalanceDiffMinutes`
- **QT9:** OT tích lũy giữa 2 nghỉ ≤ `maxOtBetweenRestHours`
- **QT10:** Nếu có OT thì ≥ `minOtPerDayMinutes`

---

## 🎯 Kết Luận

### **Bước 4:**
- ✅ Phân bổ OT theo các ràng buộc QT6-QT10
- ✅ Phân bổ Late đơn giản (random trong max)
- ✅ Cân bằng OT trong phòng (QT8)

### **Bước 5:**
- ✅ Sinh giờ vào/ra dựa trên ca, OT, Late
- ✅ Xét nhóm đặc thù (giảm giờ làm)
- ✅ Random trong khung giờ cho tự nhiên

### **Đặc điểm:**
- ✅ Tự động phân bổ theo tổng OT/Late của NV
- ✅ Tuân thủ tất cả ràng buộc
- ✅ Cân bằng công bằng giữa các NV trong phòng

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0  
**File code:**
- `src/app/api/distribution/step/4/route.ts`
- `src/app/api/distribution/step/5/route.ts`
- `src/lib/distributionEngine.ts` (distributeOT, distributeLate, step6_generateTime)
