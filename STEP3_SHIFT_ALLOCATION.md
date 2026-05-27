# 📋 Bước 3: Chia Ca (Shift Allocation)

## 🎯 Mục Tiêu

Phân bổ ca làm việc (shift_code) cho từng ngày làm của nhân viên, đảm bảo:
- Cân bằng số lượng nhân viên giữa các ca trong cùng phòng ban
- Mỗi ngày trong phòng, số NV Ca 1 và Ca 2 gần bằng nhau (chênh lệch ≤ 1)
- CHỈ chia ca cho ngày làm (dayType = 0), các ngày nghỉ để trống

---

## 🔧 Giải Thuật

### **Input:**
- `distribution_results`: Kết quả từ Bước 2 (đã có dayType)
- `shifts`: Danh sách ca làm việc theo phòng ban
  - Ca riêng: có `department_id` (ví dụ: Ca 1 Sản Xuất, Ca 2 Sản Xuất)
  - Ca chung: `department_id = NULL` (áp dụng cho tất cả phòng không có ca riêng)
- `employees`: Danh sách nhân viên và phòng ban

### **Output:**
- Cập nhật `shift_code` trong `distribution_results`

### **Logic Tra Cứu Ca:**

```typescript
// 1. Load shifts map từ bảng shifts
const shiftMap = await loadShiftMap(monthId);
// shiftMap['DEFAULT'] = ca chung (department_id IS NULL)
// shiftMap[deptId] = ca riêng của phòng ban (department_id = deptId)

// 2. Với mỗi nhân viên, tra cứu ca
const deptId = emp.departmentId;
const entry = getShiftEntry(shiftMap, deptId);

// getShiftEntry logic (trong stepHelpers.ts):
function getShiftEntry(shiftMap, deptId) {
  const defaultEntry = shiftMap.get('DEFAULT') ?? { ca1: null, ca2: null };
  if (!deptId) return defaultEntry; // NV không có phòng → ca chung
  return shiftMap.get(deptId) ?? defaultEntry; // Có phòng → ca riêng hoặc fallback ca chung
}

// Quy tắc:
// - Nếu phòng ban CÓ ca riêng (shiftMap[deptId] tồn tại) → dùng ca riêng
// - Nếu phòng ban KHÔNG có ca riêng (shiftMap[deptId] = undefined) → fallback về ca chung (DEFAULT)
```

**Ví dụ dữ liệu trong bảng `shifts`:**

| id | month_id | department_id | shift_type | clock_in | clock_out |
|----|----------|---------------|------------|----------|-----------|
| 1  | m1       | NULL          | Ca 1       | 07:30    | 16:30     |
| 2  | m1       | NULL          | Ca 2       | 13:00    | 22:00     |
| 3  | m1       | dept_sx       | Ca 1       | 07:00    | 16:00     |
| 4  | m1       | dept_sx       | Ca 2       | 13:30    | 22:30     |
| 5  | m1       | dept_hr       | Ca 1       | 08:00    | 17:00     |

**Kết quả `shiftMap`:**
```typescript
shiftMap = {
  'DEFAULT': { ca1: {clockIn: '07:30', ...}, ca2: {clockIn: '13:00', ...} }, // Ca chung
  'dept_sx': { ca1: {clockIn: '07:00', ...}, ca2: {clockIn: '13:30', ...} }, // Ca riêng Sản Xuất
  'dept_hr': { ca1: {clockIn: '08:00', ...}, ca2: null },                    // Ca riêng Nhân Sự (chỉ 1 ca)
}
```

**Tra cứu:**
- NV thuộc phòng Sản Xuất (dept_sx) → `getShiftEntry(shiftMap, 'dept_sx')` → ca riêng Sản Xuất
- NV thuộc phòng Kế Toán (dept_kt) → `getShiftEntry(shiftMap, 'dept_kt')` → ca chung (DEFAULT)
- NV thuộc phòng Nhân Sự (dept_hr) → `getShiftEntry(shiftMap, 'dept_hr')` → ca riêng Nhân Sự

### **Logic Chia Ca:**

```typescript
// 1. Load dữ liệu
const shiftMap = await loadShiftMap(monthId);  // Ca theo phòng ban
const emps = await loadEmployees(monthId);     // Nhân viên
const allDays = await loadDistributionResults(monthId); // Kết quả Bước 2

// 2. Nhóm ngày theo nhân viên
const daysByEmp = groupByEmployee(allDays);

// 3. Đếm số NV mỗi ca theo phòng ban và ngày
// deptDayCount[deptId][day] = { c1: số NV Ca1, c2: số NV Ca2 }
const deptDayCount = new Map<string, Map<number, { c1: number; c2: number }>>();

// 4. Với mỗi nhân viên
for (const emp of emps) {
  const deptId = emp.departmentId;
  const shifts = getShiftEntry(shiftMap, deptId);
  const days = daysByEmp.get(emp.id);
  
  // Trường hợp 1: Chỉ có 1 ca
  if (!shifts.ca1 || !shifts.ca2) {
    for (const day of days) {
      if (day.dayType === 0) {
        // Ngày làm → gán ca duy nhất
        day.shiftCode = shifts.ca1?.shiftType || shifts.ca2?.shiftType || '';
      } else {
        // Ngày nghỉ → để trống
        day.shiftCode = '';
      }
    }
    continue;
  }
  
  // Trường hợp 2: Có 2 ca → chia cân bằng
  for (const day of days) {
    if (day.dayType !== 0) {
      // Ngày nghỉ → để trống
      day.shiftCode = '';
      continue;
    }
    
    // Ngày làm → chọn ca ít hơn để cân bằng
    const count = deptDayCount.get(deptId).get(day.day);
    
    if (count.c1 < count.c2) {
      // Ca 1 ít hơn → chọn Ca 1
      day.shiftCode = 'C1';
      count.c1++;
    } else if (count.c2 < count.c1) {
      // Ca 2 ít hơn → chọn Ca 2
      day.shiftCode = 'C2';
      count.c2++;
    } else {
      // Bằng nhau → random
      day.shiftCode = random(1, 2) === 1 ? 'C1' : 'C2';
      day.shiftCode === 'C1' ? count.c1++ : count.c2++;
    }
  }
}

// 5. Bulk update vào DB
await bulkUpdateShiftCode(allDays);
```

---

## 📊 Ví Dụ Cụ Thể

### **Ví dụ 1: Phòng có ca riêng (Sản Xuất có Ca 1 và Ca 2):**

```
Phòng Sản Xuất:
- Có ca riêng trong bảng shifts (department_id = 'dept_sx')
- shiftMap['dept_sx'] = { ca1: {clockIn: '07:00', ...}, ca2: {clockIn: '13:30', ...} }
- Ca 1: 07:00-16:00
- Ca 2: 13:30-22:30

Ngày 1 (10 nhân viên):
- NV001: dayType=0 (làm) → count: C1=0, C2=0 → random → C1 → count: C1=1, C2=0
- NV002: dayType=0 (làm) → count: C1=1, C2=0 → chọn C2 → count: C1=1, C2=1
- NV003: dayType=0 (làm) → count: C1=1, C2=1 → random → C2 → count: C1=1, C2=2
- NV004: dayType=0 (làm) → count: C1=1, C2=2 → chọn C1 → count: C1=2, C2=2
- NV005: dayType=1 (LP)  → shiftCode = '' (không chia ca)
- NV006: dayType=0 (làm) → count: C1=2, C2=2 → random → C1 → count: C1=3, C2=2
- NV007: dayType=0 (làm) → count: C1=3, C2=2 → chọn C2 → count: C1=3, C2=3
- NV008: dayType=2 (PN)  → shiftCode = '' (không chia ca)
- NV009: dayType=0 (làm) → count: C1=3, C2=3 → random → C2 → count: C1=3, C2=4
- NV010: dayType=0 (làm) → count: C1=3, C2=4 → chọn C1 → count: C1=4, C2=4

Kết quả ngày 1:
- Ca 1 (ca riêng Sản Xuất): 4 người (NV001, NV004, NV006, NV010)
- Ca 2 (ca riêng Sản Xuất): 4 người (NV002, NV003, NV007, NV009)
- Nghỉ: 2 người (NV005=LP, NV008=PN)
→ Phòng có ca riêng → chia theo ca 1, 2 và cân bằng ✅
```

### **Ví dụ 2: Phòng KHÔNG có ca riêng → Dùng ca chung (DEFAULT):**

```
Phòng Kế Toán:
- KHÔNG có ca riêng trong bảng shifts (không có record với department_id = 'dept_kt')
- shiftMap['dept_kt'] = undefined
- → Fallback về ca chung: shiftMap['DEFAULT'] = { ca1: {...}, ca2: {...} }

Giả sử ca chung có 2 ca:
- Ca 1: 07:30-16:30
- Ca 2: 13:00-22:00

Ngày 1 (5 nhân viên):
- NV101: dayType=0 (làm) → count: C1=0, C2=0 → random → C1 → count: C1=1, C2=0
- NV102: dayType=0 (làm) → count: C1=1, C2=0 → chọn C2 → count: C1=1, C2=1
- NV103: dayType=1 (LP)  → shiftCode = '' (không chia ca)
- NV104: dayType=0 (làm) → count: C1=1, C2=1 → random → C2 → count: C1=1, C2=2
- NV105: dayType=0 (làm) → count: C1=1, C2=2 → chọn C1 → count: C1=2, C2=2

Kết quả ngày 1:
- Ca 1 (ca chung): 2 người (NV101, NV105)
- Ca 2 (ca chung): 2 người (NV102, NV104)
- Nghỉ: 1 người (NV103=LP)
→ Phòng không có ca riêng → dùng ca chung và chia cân bằng ✅

---

Giả sử ca chung CHỈ có 1 ca:
- Ca Hành Chính: 08:00-17:00

Ngày 1 (5 nhân viên):
- NV101: dayType=0 (làm) → Ca Hành Chính → shiftCode = 'Ca Hành Chính'
- NV102: dayType=0 (làm) → Ca Hành Chính → shiftCode = 'Ca Hành Chính'
- NV103: dayType=1 (LP)  → shiftCode = '' (không chia ca)
- NV104: dayType=0 (làm) → Ca Hành Chính → shiftCode = 'Ca Hành Chính'
- NV105: dayType=0 (làm) → Ca Hành Chính → shiftCode = 'Ca Hành Chính'

Kết quả ngày 1:
- Ca Hành Chính: 4 người (NV101, NV102, NV104, NV105)
- Nghỉ: 1 người (NV103=LP)
→ Phòng không có ca riêng → dùng ca chung duy nhất ✅
```

### **Ví dụ 3: Phòng có ca riêng nhưng chỉ 1 ca:**

```
Phòng Nhân Sự:
- Có ca riêng trong bảng shifts (department_id = 'dept_hr')
- shiftMap['dept_hr'] = { ca1: {clockIn: '08:00', ...}, ca2: null }
- Ca Hành Chính: 08:00-17:00

Ngày 1 (3 nhân viên):
- NV201: dayType=0 (làm) → Ca Hành Chính → shiftCode = 'Ca Hành Chính'
- NV202: dayType=0 (làm) → Ca Hành Chính → shiftCode = 'Ca Hành Chính'
- NV203: dayType=3 (Ô)   → shiftCode = '' (không chia ca)

Kết quả ngày 1:
- Ca Hành Chính (ca riêng Nhân Sự): 2 người (NV201, NV202)
- Nghỉ ốm: 1 người (NV203=Ô)
→ Phòng có ca riêng nhưng chỉ 1 ca → tất cả cùng ca duy nhất ✅
```

### **Ví dụ 4: So sánh ca chung vs ca riêng:**

```
Tháng 1/2026:

Bảng shifts:
| department_id | shift_type | clock_in | clock_out |
|---------------|------------|----------|-----------|
| NULL          | Ca 1       | 07:30    | 16:30     | ← Ca chung
| NULL          | Ca 2       | 13:00    | 22:00     | ← Ca chung
| dept_sx       | Ca 1       | 07:00    | 16:00     | ← Ca riêng Sản Xuất
| dept_sx       | Ca 2       | 13:30    | 22:30     | ← Ca riêng Sản Xuất

Phòng Sản Xuất (dept_sx):
- Có ca riêng → dùng ca riêng (07:00-16:00 và 13:30-22:30)
- NV làm ngày 1 → chia theo C1 (07:00-16:00) hoặc C2 (13:30-22:30)

Phòng Kế Toán (dept_kt):
- KHÔNG có ca riêng → dùng ca chung (07:30-16:30 và 13:00-22:00)
- NV làm ngày 1 → chia theo C1 (07:30-16:30) hoặc C2 (13:00-22:00)

Phòng Giám Đốc (dept_bgd):
- KHÔNG có ca riêng → dùng ca chung (07:30-16:30 và 13:00-22:00)
- NV làm ngày 1 → chia theo C1 (07:30-16:30) hoặc C2 (13:00-22:00)

→ Mỗi phòng có thể có ca riêng hoặc dùng ca chung
→ Ca chung là fallback cho tất cả phòng không có ca riêng
```

---

## 🔍 Chi Tiết Code

### **1. Kiểm tra dayType trước khi chia ca:**

```typescript
for (const d of days) {
  if (d.dayType !== 0) { 
    // Ngày nghỉ (LP, PN, Ô, TS, DS, O, NL, OF, P, ...)
    // → Không chia ca, để trống shift_code
    rows.push(`('${emp.id}',${d.day},'')`); 
    continue; 
  }
  
  // Ngày làm (dayType = 0) → Chia ca
  // ...
}
```

**Ý nghĩa:**
- CHỈ chia ca cho ngày làm (dayType = 0)
- Tất cả ngày nghỉ (dayType ≠ 0) đều để trống shift_code
- KHÔNG thay đổi dayType, chỉ cập nhật shift_code

### **2. Logic cân bằng ca:**

```typescript
const cnt = dayCount.get(d.day)!;

if (cnt.c1 < cnt.c2) { 
  // Ca 1 ít hơn → ưu tiên Ca 1
  sc = 'C1'; 
  cnt.c1++; 
} else if (cnt.c2 < cnt.c1) { 
  // Ca 2 ít hơn → ưu tiên Ca 2
  sc = 'C2'; 
  cnt.c2++; 
} else { 
  // Bằng nhau → random
  sc = randInt(1, 2) === 1 ? 'C1' : 'C2'; 
  sc === 'C1' ? cnt.c1++ : cnt.c2++; 
}
```

**Ý nghĩa:**
- Đảm bảo số NV giữa 2 ca luôn cân bằng (chênh lệch ≤ 1)
- Ưu tiên ca có ít người hơn
- Nếu bằng nhau thì random để tránh bias

### **3. Bulk update hiệu suất cao:**

```typescript
// Tạo temp table
await conn.run(`CREATE TEMP TABLE IF NOT EXISTS _tmp_shift 
  (emp_id VARCHAR, day INTEGER, shift_code VARCHAR)`);

// Insert batch vào temp table
for (let i = 0; i < rows.length; i += chunkSize) {
  await conn.run(`INSERT INTO _tmp_shift VALUES ${rows.slice(i, i + chunkSize).join(',')}`);
}

// UPDATE JOIN 1 lần duy nhất
await conn.run(`
  UPDATE distribution_results dr
  SET shift_code = t.shift_code
  FROM _tmp_shift t
  WHERE dr.month_id = '${monthId}' 
    AND dr.employee_id = t.emp_id 
    AND dr.day = t.day
`);
```

**Ý nghĩa:**
- Tránh N queries UPDATE riêng lẻ
- Sử dụng temp table + UPDATE JOIN → hiệu suất cao
- Xử lý hàng nghìn records trong 1 transaction

---

## ⚠️ Ràng Buộc Quan Trọng

### **1. KHÔNG thay đổi dayType**
```typescript
// ✅ ĐÚNG: Chỉ đọc dayType, không thay đổi
if (d.dayType !== 0) { ... }

// ❌ SAI: Thay đổi dayType
d.dayType = 1; // KHÔNG BAO GIỜ LÀM ĐIỀU NÀY!
```

### **2. CHỈ chia ca cho ngày làm (dayType = 0)**
```typescript
// ✅ ĐÚNG
if (d.dayType === 0) {
  // Chia ca
  d.shiftCode = 'C1' hoặc 'C2';
} else {
  // Ngày nghỉ → để trống
  d.shiftCode = '';
}

// ❌ SAI: Chia ca cho ngày nghỉ
if (d.dayType === 1) {
  d.shiftCode = 'C1'; // KHÔNG BAO GIỜ LÀM ĐIỀU NÀY!
}
```

### **3. Giữ nguyên dữ liệu cố định**
```typescript
// Dữ liệu cố định (dayType ≥ 3) KHÔNG được thay đổi
// Ví dụ:
// - dayType = 3 (Ô - nghỉ ốm)
// - dayType = 4 (TS - thai sản)
// - dayType = 7 (NL - nghỉ lễ)
// → Tất cả đều để trống shift_code, KHÔNG chia ca
```

---

## 📈 Quy Tắc QT5: Phân Bổ Ca Cân Bằng

### **Định nghĩa:**
Số lượng nhân viên giữa các ca trong cùng phòng ban phải gần bằng nhau mỗi ngày.

### **Công thức:**
```
Chênh lệch = |số NV Ca 1 - số NV Ca 2| ≤ 1
```

### **Ví dụ:**
```
Phòng Sản Xuất có 10 NV, ngày 1 có 8 người làm:

✅ OK: Ca 1 = 4 người, Ca 2 = 4 người → Chênh 0
✅ OK: Ca 1 = 5 người, Ca 2 = 3 người → Chênh 2 (chấp nhận được nếu có lẻ)
❌ VI PHẠM: Ca 1 = 7 người, Ca 2 = 1 người → Chênh 6
```

---

## 🔄 Flow Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│ Bước 2: Tạo arrangement (dayType)                       │
│ → Kết quả: X (0), LP (1), PN (2), Ô (3), TS (4), ...   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 3: Chia ca (shift_code)                            │
│ → CHỈ xử lý dayType = 0 (ngày làm)                      │
│ → Các ngày nghỉ (dayType ≠ 0) để trống shift_code      │
│ → KHÔNG thay đổi dayType                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 4: Phân bổ OT (ot_hours)                           │
│ → CHỈ xử lý dayType = 0                                 │
│ → KHÔNG thay đổi dayType                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 5: Phân bổ Trễ (late_mins)                         │
│ → CHỈ xử lý dayType = 0                                 │
│ → KHÔNG thay đổi dayType                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 6: Sinh giờ vào/ra (check_in, check_out)          │
│ → CHỈ xử lý dayType = 0                                 │
│ → KHÔNG thay đổi dayType                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Kết Luận

### **Bước 3 làm gì:**
- ✅ Phân bổ ca làm việc (shift_code) cho ngày làm (dayType = 0)
- ✅ Cân bằng số NV giữa các ca trong cùng phòng ban
- ✅ Để trống shift_code cho tất cả ngày nghỉ (dayType ≠ 0)

### **Bước 3 KHÔNG làm gì:**
- ❌ KHÔNG thay đổi dayType
- ❌ KHÔNG chia ca cho ngày nghỉ
- ❌ KHÔNG động đến dữ liệu cố định (Ô, TS, DS, O, NL, OF, P, ...)

### **An toàn:**
- ✅ Tuân thủ ràng buộc: CHỈ đọc dayType, KHÔNG thay đổi
- ✅ Giữ nguyên dữ liệu đầu vào cố định (dayType ≥ 3)
- ✅ CHỈ cập nhật shift_code, không ảnh hưởng các trường khác

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0
