# 🔧 Giải Thuật Sửa Cân Bằng Ca (Fix Shift Balance)

## 🎯 Mục Tiêu

Tự động sửa vi phạm cân bằng ca bằng cách **chuyển NV từ ca đông sang ca ít** cho đến khi chênh lệch ≤ 1.

**API:** `POST /api/distribution/fix-shift-balance`

---

## 🔍 Vấn Đề Cần Sửa

### **Vi phạm:**
```
Phòng Sản Xuất - Ngày 5:
- Ca 1: 4 NV (NV001, NV002, NV003, NV004)
- Ca 2: 1 NV (NV005)
→ Chênh lệch: |4 - 1| = 3 > 1 ⚠️ VI PHẠM
```

### **Mục tiêu sau khi sửa:**
```
Phòng Sản Xuất - Ngày 5:
- Ca 1: 2 NV (NV001, NV002)
- Ca 2: 3 NV (NV003, NV004, NV005)
→ Chênh lệch: |2 - 3| = 1 ✅ OK
```

---

## 🔧 Giải Thuật

### **Bước 1: Load dữ liệu**

```typescript
// Load tất cả ngày làm (dayType = 0) có ca C1 hoặc C2
const rows = await conn.all<{ empId: string; deptId: string; day: number; shiftCode: string }>(
  `SELECT dr.employee_id AS empId, e.department_id AS deptId, 
          dr.day, dr.shift_code AS shiftCode
   FROM distribution_results dr
   JOIN employees e ON dr.employee_id = e.id
   WHERE dr.month_id = ? 
     AND dr.day_type = 0           -- Chỉ ngày làm
     AND dr.shift_code IN ('C1','C2')  -- Chỉ ca 1 và ca 2
   ORDER BY e.department_id, dr.day, e.code`, 
  monthId
);
```

**Kết quả:**
```
[
  { empId: 'emp1', deptId: 'dept_sx', day: 5, shiftCode: 'C1' },
  { empId: 'emp2', deptId: 'dept_sx', day: 5, shiftCode: 'C1' },
  { empId: 'emp3', deptId: 'dept_sx', day: 5, shiftCode: 'C1' },
  { empId: 'emp4', deptId: 'dept_sx', day: 5, shiftCode: 'C1' },
  { empId: 'emp5', deptId: 'dept_sx', day: 5, shiftCode: 'C2' },
  ...
]
```

---

### **Bước 2: Nhóm dữ liệu theo phòng ban và ngày**

```typescript
// Cấu trúc: deptDay[deptId][day] = { c1: [empIds...], c2: [empIds...] }
type DayShift = { c1: string[]; c2: string[] };
const deptDay = new Map<string, Map<number, DayShift>>();

for (const r of rows) {
  // Khởi tạo map nếu chưa có
  if (!deptDay.has(r.deptId)) {
    deptDay.set(r.deptId, new Map());
  }
  const dayMap = deptDay.get(r.deptId)!;
  
  if (!dayMap.has(r.day)) {
    dayMap.set(r.day, { c1: [], c2: [] });
  }
  const stat = dayMap.get(r.day)!;
  
  // Thêm empId vào ca tương ứng
  if (r.shiftCode === 'C1') {
    stat.c1.push(r.empId);
  } else {
    stat.c2.push(r.empId);
  }
}
```

**Kết quả:**
```typescript
deptDay = {
  'dept_sx': {
    5: { 
      c1: ['emp1', 'emp2', 'emp3', 'emp4'],  // 4 NV
      c2: ['emp5']                            // 1 NV
    },
    6: {
      c1: ['emp1', 'emp2'],
      c2: ['emp3', 'emp4']
    },
    ...
  },
  'dept_kt': {
    ...
  }
}
```

---

### **Bước 3: Cân bằng ca**

```typescript
const changes: { empId: string; day: number; shiftCode: string }[] = [];

for (const [deptId, dayMap] of deptDay) {
  for (const [day, stat] of dayMap) {
    // Lặp cho đến khi chênh lệch ≤ 1
    while (Math.abs(stat.c1.length - stat.c2.length) > 1) {
      
      if (stat.c1.length > stat.c2.length) {
        // Ca 1 đông hơn → Chuyển 1 NV từ Ca 1 sang Ca 2
        const empId = stat.c1.pop()!;  // Lấy NV cuối cùng trong Ca 1
        stat.c2.push(empId);           // Thêm vào Ca 2
        changes.push({ empId, day, shiftCode: 'C2' });
        
      } else {
        // Ca 2 đông hơn → Chuyển 1 NV từ Ca 2 sang Ca 1
        const empId = stat.c2.pop()!;  // Lấy NV cuối cùng trong Ca 2
        stat.c1.push(empId);           // Thêm vào Ca 1
        changes.push({ empId, day, shiftCode: 'C1' });
      }
    }
  }
}
```

**Logic chi tiết:**

| Trạng thái | Hành động |
|------------|-----------|
| `c1.length - c2.length > 1` | Chuyển NV từ Ca 1 → Ca 2 |
| `c2.length - c1.length > 1` | Chuyển NV từ Ca 2 → Ca 1 |
| `|c1.length - c2.length| ≤ 1` | ✅ Dừng lại (đã cân bằng) |

---

### **Bước 4: Cập nhật database**

```typescript
if (changes.length === 0) {
  // Không có gì cần sửa
  return NextResponse.json({ ok: true, fixed: 0 });
}

// Cập nhật trong transaction
await conn.run('BEGIN TRANSACTION');
try {
  for (const c of changes) {
    await conn.run(
      `UPDATE distribution_results 
       SET shift_code = ? 
       WHERE month_id = ? AND employee_id = ? AND day = ?`,
      c.shiftCode, monthId, c.empId, c.day
    );
  }
  await conn.run('COMMIT');
} catch (e) {
  await conn.run('ROLLBACK');
  throw e;
}

return NextResponse.json({ ok: true, fixed: changes.length });
```

---

## 📊 Ví Dụ Chi Tiết

### **Ví dụ 1: Chênh 3 → Cân bằng**

**Trước khi sửa:**
```
Phòng Sản Xuất - Ngày 5:
- Ca 1: [NV001, NV002, NV003, NV004]  (4 NV)
- Ca 2: [NV005]                        (1 NV)
→ Chênh: |4 - 1| = 3 > 1 ⚠️
```

**Quá trình sửa:**

**Lần 1:**
```
c1.length = 4, c2.length = 1
→ c1 > c2 → Chuyển NV004 từ Ca 1 sang Ca 2

Sau lần 1:
- Ca 1: [NV001, NV002, NV003]  (3 NV)
- Ca 2: [NV005, NV004]          (2 NV)
→ Chênh: |3 - 2| = 1 ✅ DỪNG
```

**Kết quả:**
```
changes = [
  { empId: 'NV004', day: 5, shiftCode: 'C2' }
]

Sau khi sửa:
- Ca 1: 3 NV (NV001, NV002, NV003)
- Ca 2: 2 NV (NV004, NV005)
→ Chênh: 1 ✅ OK
```

---

### **Ví dụ 2: Chênh 4 → Cân bằng**

**Trước khi sửa:**
```
Phòng Kế Toán - Ngày 10:
- Ca 1: [NV101, NV102, NV103, NV104, NV105, NV106]  (6 NV)
- Ca 2: [NV107, NV108]                               (2 NV)
→ Chênh: |6 - 2| = 4 > 1 ⚠️
```

**Quá trình sửa:**

**Lần 1:**
```
c1.length = 6, c2.length = 2
→ c1 > c2 → Chuyển NV106 từ Ca 1 sang Ca 2

Sau lần 1:
- Ca 1: [NV101, NV102, NV103, NV104, NV105]  (5 NV)
- Ca 2: [NV107, NV108, NV106]                 (3 NV)
→ Chênh: |5 - 3| = 2 > 1 → TIẾP TỤC
```

**Lần 2:**
```
c1.length = 5, c2.length = 3
→ c1 > c2 → Chuyển NV105 từ Ca 1 sang Ca 2

Sau lần 2:
- Ca 1: [NV101, NV102, NV103, NV104]  (4 NV)
- Ca 2: [NV107, NV108, NV106, NV105]  (4 NV)
→ Chênh: |4 - 4| = 0 ✅ DỪNG
```

**Kết quả:**
```
changes = [
  { empId: 'NV106', day: 10, shiftCode: 'C2' },
  { empId: 'NV105', day: 10, shiftCode: 'C2' }
]

Sau khi sửa:
- Ca 1: 4 NV (NV101, NV102, NV103, NV104)
- Ca 2: 4 NV (NV105, NV106, NV107, NV108)
→ Chênh: 0 ✅ HOÀN HẢO
```

---

### **Ví dụ 3: Nhiều phòng, nhiều ngày**

**Trước khi sửa:**
```
Phòng Sản Xuất - Ngày 5:
- Ca 1: 4 NV, Ca 2: 1 NV → Chênh 3 ⚠️

Phòng Sản Xuất - Ngày 8:
- Ca 1: 2 NV, Ca 2: 5 NV → Chênh 3 ⚠️

Phòng Kế Toán - Ngày 12:
- Ca 1: 6 NV, Ca 2: 2 NV → Chênh 4 ⚠️
```

**Sau khi sửa:**
```
Phòng Sản Xuất - Ngày 5:
- Ca 1: 3 NV, Ca 2: 2 NV → Chênh 1 ✅
- Chuyển: 1 NV từ Ca 1 → Ca 2

Phòng Sản Xuất - Ngày 8:
- Ca 1: 3 NV, Ca 2: 4 NV → Chênh 1 ✅
- Chuyển: 1 NV từ Ca 2 → Ca 1

Phòng Kế Toán - Ngày 12:
- Ca 1: 4 NV, Ca 2: 4 NV → Chênh 0 ✅
- Chuyển: 2 NV từ Ca 1 → Ca 2

Tổng: fixed = 4 thay đổi
```

---

## 🔄 Flow Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│ 1. Load dữ liệu                                         │
│    - Chỉ ngày làm (dayType = 0)                         │
│    - Chỉ ca C1 và C2                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Nhóm theo phòng ban và ngày                          │
│    deptDay[deptId][day] = { c1: [empIds], c2: [empIds] }│
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Với mỗi phòng, mỗi ngày:                             │
│    while (|c1.length - c2.length| > 1) {                │
│      if (c1 > c2) chuyển NV từ Ca 1 → Ca 2             │
│      else chuyển NV từ Ca 2 → Ca 1                      │
│    }                                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Cập nhật database (transaction)                      │
│    UPDATE distribution_results SET shift_code = ...     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Trả về kết quả                                       │
│    { ok: true, fixed: số lượng thay đổi }              │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Lưu Ý Quan Trọng

### **1. CHỈ sửa ca C1 và C2**
```typescript
// Chỉ load ca C1 và C2
WHERE dr.shift_code IN ('C1','C2')

// Bỏ qua các ca khác:
// - Ca Hành Chính
// - Ca chung
// - Ca đặc biệt
```

### **2. CHỈ sửa ngày làm (dayType = 0)**
```typescript
// Chỉ load ngày làm
WHERE dr.day_type = 0

// Bỏ qua:
// - Ngày nghỉ LP (dayType = 1)
// - Ngày phép PN (dayType = 2)
// - Ngày nghỉ đặc biệt (dayType ≥ 3)
```

### **3. KHÔNG thay đổi dayType**
```typescript
// CHỈ cập nhật shift_code
UPDATE distribution_results SET shift_code = ?

// KHÔNG thay đổi:
// - day_type (giữ nguyên = 0)
// - ot_hours
// - late_mins
// - check_in, check_out
```

### **4. Chọn NV nào để chuyển?**
```typescript
// Lấy NV cuối cùng trong mảng (pop)
const empId = stat.c1.pop()!;

// Lý do: Đơn giản, không cần logic phức tạp
// Có thể cải tiến: Chọn NV theo tiêu chí khác (ví dụ: ưu tiên NV ít OT)
```

### **5. Xử lý phòng chỉ có 1 ca**
```typescript
// Nếu phòng chỉ có Ca Hành Chính (không có C1, C2)
// → Không có trong kết quả query
// → Không bị xử lý
// → An toàn ✅
```

---

## 🎯 Kết Luận

### **Giải thuật:**
1. ✅ Load dữ liệu (chỉ ngày làm, chỉ ca C1/C2)
2. ✅ Nhóm theo phòng ban và ngày
3. ✅ Cân bằng: Chuyển NV từ ca đông sang ca ít
4. ✅ Cập nhật database trong transaction
5. ✅ Trả về số lượng thay đổi

### **Ưu điểm:**
- ✅ Đơn giản, dễ hiểu
- ✅ Tự động sửa tất cả vi phạm
- ✅ An toàn: Chỉ thay đổi shift_code, không động đến dayType
- ✅ Hiệu quả: Xử lý nhiều phòng, nhiều ngày cùng lúc

### **Hạn chế:**
- ⚠️ Chọn NV ngẫu nhiên (NV cuối cùng trong mảng)
- ⚠️ Không xét đến yếu tố khác (OT, late, sở thích NV)
- ⚠️ Có thể tạo ra phân bổ không tối ưu cho NV cụ thể

### **Cải tiến có thể:**
- 🔧 Chọn NV theo tiêu chí: Ưu tiên NV có ít OT hơn
- 🔧 Xét đến sở thích ca của NV (nếu có dữ liệu)
- 🔧 Cân bằng theo tuần thay vì theo ngày

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0  
**File code:** `src/app/api/distribution/fix-shift-balance/route.ts`
