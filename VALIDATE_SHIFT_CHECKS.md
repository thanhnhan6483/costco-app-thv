# 🔍 Giải Thuật Kiểm Tra Ca Làm Việc

## 🎯 Mục Tiêu

Nút "Kiểm tra" thực hiện 2 kiểm tra quan trọng về ca làm việc:

1. **Check 1: Chia ca (100% ngày làm có ca)**
   - Đảm bảo TẤT CẢ ngày làm (dayType = 0) đều được gán ca
   - Không có ngày làm nào bị thiếu shift_code

2. **Check 2: Cân bằng ca trong phòng (chênh ≤ 1 NV)**
   - Đảm bảo số NV Ca1 và Ca2 trong cùng phòng mỗi ngày chênh lệch ≤ 1
   - Tuân thủ quy tắc QT5: Phân bổ ca cân bằng

---

## 📋 Check 1: Chia Ca (100% Ngày Làm Có Ca)

### **Mục đích:**
Kiểm tra xem tất cả ngày làm (dayType = 0) đã được gán ca chưa.

### **Giải thuật:**

```typescript
// 1. Khởi tạo kết quả kiểm tra
const checkShift: CheckResult = {
  id: 'shift_assigned',
  label: 'Chia ca (100% ngày làm có ca)',
  description: 'Tất cả ngày làm (X) phải được gán ca (Ca 1 / Ca 2)',
  status: 'ok',
  violations: [],
  violationCount: 0,
  checkedCount: totalEmps,
};

// 2. Duyệt qua tất cả nhân viên
for (const emp of emps) {
  const deptName = deptMap.get(emp.deptId)?.name ?? '—';
  
  // 3. Duyệt qua tất cả ngày của nhân viên
  for (const d of emp.days) {
    // 4. Kiểm tra: Nếu là ngày làm (dayType = 0) NHƯNG không có shift_code
    if (d.dayType === 0 && !d.shiftCode) {
      // → Vi phạm!
      checkShift.violations.push({
        code: emp.code,
        name: emp.name,
        deptName,
        day: d.day,
        detail: `Ngày ${d.day}: ngày làm chưa được gán ca`,
      });
      break; // 1 vi phạm/NV là đủ (không cần kiểm tra tiếp)
    }
  }
}

// 5. Tổng hợp kết quả
checkShift.violationCount = checkShift.violations.length;
checkShift.status = checkShift.violationCount === 0 ? 'ok' : 'error';
results.push(checkShift);
```

### **Logic chi tiết:**

| Điều kiện | Kết quả |
|-----------|---------|
| `dayType === 0` và `shiftCode !== ''` | ✅ OK - Ngày làm đã có ca |
| `dayType === 0` và `shiftCode === ''` | ❌ VI PHẠM - Ngày làm thiếu ca |
| `dayType !== 0` (LP, PN, Ô, ...) | ⏭️ BỎ QUA - Ngày nghỉ không cần ca |

### **Ví dụ:**

```
NV001 - Nguyễn Văn A - Phòng Sản Xuất:
- Ngày 1: dayType=0, shiftCode='C1' → ✅ OK
- Ngày 2: dayType=0, shiftCode='C2' → ✅ OK
- Ngày 3: dayType=1, shiftCode=''   → ⏭️ BỎ QUA (LP - không cần ca)
- Ngày 4: dayType=0, shiftCode=''   → ❌ VI PHẠM (ngày làm thiếu ca)
- Ngày 5: dayType=0, shiftCode='C1' → ✅ OK

Kết quả:
- Vi phạm: 1 (Ngày 4)
- Status: error
```

---

## ⚖️ Check 2: Cân Bằng Ca Trong Phòng (Chênh ≤ 1 NV)

### **Mục đích:**
Kiểm tra xem số NV Ca1 và Ca2 trong cùng phòng mỗi ngày có cân bằng không (chênh lệch ≤ 1).

### **Giải thuật:**

```typescript
// 1. Khởi tạo kết quả kiểm tra
const checkShiftBalance: CheckResult = {
  id: 'shift_balance',
  label: 'Cân bằng ca trong phòng (chênh ≤ 1 NV)',
  description: 'Số NV Ca1 và Ca2 trong cùng phòng mỗi ngày chênh ≤ 1',
  status: 'ok',
  violations: [],
  violationCount: 0,
  checkedCount: totalEmps,
};

// 2. Đếm số NV mỗi ca theo phòng và ngày
// deptDayShift[deptId][day] = { c1: số NV Ca1, c2: số NV Ca2 }
const deptDayShift = new Map<string, Map<number, { c1: number; c2: number }>>();

for (const emp of emps) {
  for (const d of emp.days) {
    // Chỉ đếm ngày làm (dayType = 0) và có shift_code
    if (d.dayType !== 0 || !d.shiftCode) continue;
    
    // Khởi tạo map nếu chưa có
    if (!deptDayShift.has(emp.deptId)) {
      deptDayShift.set(emp.deptId, new Map());
    }
    const dayMap = deptDayShift.get(emp.deptId)!;
    
    if (!dayMap.has(d.day)) {
      dayMap.set(d.day, { c1: 0, c2: 0 });
    }
    const stat = dayMap.get(d.day)!;
    
    // Đếm số NV theo ca
    if (d.shiftCode === 'C1') stat.c1++;
    else if (d.shiftCode === 'C2') stat.c2++;
  }
}

// 3. Kiểm tra cân bằng cho từng phòng
for (const [deptId, dayMap] of deptDayShift) {
  const deptName = deptMap.get(deptId)?.name ?? '—';
  const deptViolDays: string[] = [];
  
  // Kiểm tra từng ngày
  for (const [day, stat] of dayMap) {
    // Bỏ qua nếu chỉ có 1 ca (không cần cân bằng)
    if (stat.c1 === 0 || stat.c2 === 0) continue;
    
    // Tính chênh lệch
    const diff = Math.abs(stat.c1 - stat.c2);
    
    // Nếu chênh > 1 → Vi phạm
    if (diff > 1) {
      deptViolDays.push(
        `Ngày ${day}: Ca1=${stat.c1}, Ca2=${stat.c2} (chênh ${diff})`
      );
    }
  }
  
  // Nếu phòng có vi phạm → Thêm vào danh sách
  if (deptViolDays.length > 0) {
    // Dòng summary
    checkShiftBalance.violations.push({
      code: '—',
      name: `📊 ${deptName}`,
      deptName,
      day: 0,
      detail: `${deptViolDays.length} ngày vi phạm`,
    });
    
    // Chi tiết từng ngày
    for (const detail of deptViolDays) {
      checkShiftBalance.violations.push({
        code: '—',
        name: deptName,
        deptName,
        day: 0,
        detail,
      });
    }
  }
}

// 4. Tổng hợp kết quả
checkShiftBalance.violationCount = checkShiftBalance.violations.length;
checkShiftBalance.status = checkShiftBalance.violationCount === 0 ? 'ok' : 'warning';
results.push(checkShiftBalance);
```

### **Logic chi tiết:**

| Điều kiện | Kết quả |
|-----------|---------|
| `c1 = 0` hoặc `c2 = 0` | ⏭️ BỎ QUA - Chỉ có 1 ca, không cần cân bằng |
| `|c1 - c2| = 0` | ✅ HOÀN HẢO - Cân bằng tuyệt đối |
| `|c1 - c2| = 1` | ✅ OK - Chênh 1 (chấp nhận được) |
| `|c1 - c2| > 1` | ⚠️ VI PHẠM - Chênh quá nhiều |

### **Ví dụ:**

```
Phòng Sản Xuất - Ngày 1:
- NV001: C1
- NV002: C1
- NV003: C2
- NV004: C2
- NV005: C1
- NV006: C2
→ Ca1 = 3, Ca2 = 3 → Chênh 0 → ✅ OK

Phòng Sản Xuất - Ngày 2:
- NV001: C1
- NV002: C1
- NV003: C1
- NV004: C1
- NV005: C2
- NV006: C2
→ Ca1 = 4, Ca2 = 2 → Chênh 2 → ⚠️ VI PHẠM

Phòng Sản Xuất - Ngày 3:
- NV001: C1
- NV002: C1
- NV003: C1
- NV004: C2
- NV005: C2
→ Ca1 = 3, Ca2 = 2 → Chênh 1 → ✅ OK (chấp nhận được)

Kết quả:
- Vi phạm: 1 ngày (Ngày 2)
- Status: warning
- Detail: "Ngày 2: Ca1=4, Ca2=2 (chênh 2)"
```

---

## 🔄 Flow Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│ 1. Load dữ liệu từ distribution_results                 │
│    - employee_id, day, day_type, shift_code             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Nhóm dữ liệu theo nhân viên                          │
│    empMap[empId] = { code, name, deptId, days[] }      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CHECK 1: Chia ca (100% ngày làm có ca)              │
│    - Duyệt qua tất cả nhân viên                         │
│    - Kiểm tra: dayType=0 && !shiftCode → Vi phạm       │
│    - Kết quả: ok / error                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Đếm số NV mỗi ca theo phòng và ngày                  │
│    deptDayShift[deptId][day] = { c1, c2 }              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. CHECK 2: Cân bằng ca trong phòng (chênh ≤ 1)        │
│    - Duyệt qua từng phòng, từng ngày                    │
│    - Kiểm tra: |c1 - c2| > 1 → Vi phạm                 │
│    - Kết quả: ok / warning                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Trả về kết quả kiểm tra                              │
│    - checkShift: { status, violations, ... }            │
│    - checkShiftBalance: { status, violations, ... }     │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Cấu Trúc Dữ Liệu

### **Input:**
```typescript
// Từ bảng distribution_results
{
  empId: string;
  empCode: string;
  empName: string;
  deptId: string;
  day: number;
  dayType: number;      // 0=X, 1=LP, 2=PN, 3+=Ô/TS/...
  shiftCode: string;    // 'C1', 'C2', 'Ca Hành Chính', ...
}
```

### **Cấu trúc nhóm theo nhân viên:**
```typescript
type DayData = {
  day: number;
  dayType: number;
  shiftCode: string;
};

type EmpData = {
  empId: string;
  code: string;
  name: string;
  deptId: string;
  days: DayData[];
};

const empMap = new Map<string, EmpData>();
```

### **Cấu trúc đếm ca theo phòng:**
```typescript
// deptDayShift[deptId][day] = { c1: số NV Ca1, c2: số NV Ca2 }
const deptDayShift = new Map<
  string,                              // deptId
  Map<number, { c1: number; c2: number }>  // day → count
>();
```

### **Output:**
```typescript
type CheckResult = {
  id: string;              // 'shift_assigned', 'shift_balance'
  label: string;           // Tên hiển thị
  description: string;     // Mô tả chi tiết
  status: 'ok' | 'warning' | 'error';
  violations: Violation[];
  violationCount: number;
  checkedCount: number;    // Tổng số NV được kiểm tra
};

type Violation = {
  code: string;      // Mã NV
  name: string;      // Tên NV hoặc tên phòng
  deptName: string;  // Tên phòng ban
  day: number;       // Ngày vi phạm (0 nếu là summary)
  detail: string;    // Chi tiết vi phạm
};
```

---

## ⚠️ Các Trường Hợp Đặc Biệt

### **1. Phòng chỉ có 1 ca:**
```typescript
// Ví dụ: Phòng Nhân Sự chỉ có Ca Hành Chính
Ngày 1:
- NV201: Ca Hành Chính
- NV202: Ca Hành Chính
- NV203: Ca Hành Chính

→ c1 = 3, c2 = 0
→ Bỏ qua kiểm tra cân bằng (if (stat.c1 === 0 || stat.c2 === 0) continue;)
→ ✅ OK
```

### **2. Ngày có ít NV làm:**
```typescript
// Ví dụ: Ngày 15 chỉ có 3 NV làm
Ngày 15:
- NV001: C1
- NV002: C1
- NV003: C2

→ c1 = 2, c2 = 1
→ Chênh 1 → ✅ OK (chấp nhận được)
```

### **3. Ngày có nhiều NV nghỉ:**
```typescript
// Ví dụ: Ngày 20 có nhiều NV nghỉ PN
Ngày 20:
- NV001: C1 (làm)
- NV002: C2 (làm)
- NV003: PN (nghỉ) → Không đếm
- NV004: PN (nghỉ) → Không đếm
- NV005: LP (nghỉ) → Không đếm

→ c1 = 1, c2 = 1
→ Chênh 0 → ✅ OK
```

### **4. Ngày làm thiếu ca:**
```typescript
// Ví dụ: NV001 ngày 5 chưa được gán ca
NV001:
- Ngày 5: dayType=0, shiftCode=''

→ CHECK 1 vi phạm: "Ngày 5: ngày làm chưa được gán ca"
→ CHECK 2 bỏ qua (if (d.dayType !== 0 || !d.shiftCode) continue;)
```

---

## 🎯 Kết Luận

### **CHECK 1: Chia ca (100% ngày làm có ca)**
- **Mục đích:** Đảm bảo không có ngày làm nào bị thiếu ca
- **Điều kiện vi phạm:** `dayType === 0 && shiftCode === ''`
- **Status:** `ok` (không vi phạm) hoặc `error` (có vi phạm)
- **Ý nghĩa:** Nếu vi phạm → Bước 3 (Chia ca) chưa hoàn thành đúng

### **CHECK 2: Cân bằng ca trong phòng (chênh ≤ 1 NV)**
- **Mục đích:** Đảm bảo số NV giữa các ca cân bằng
- **Điều kiện vi phạm:** `|c1 - c2| > 1` (khi cả 2 ca đều có NV)
- **Status:** `ok` (không vi phạm) hoặc `warning` (có vi phạm)
- **Ý nghĩa:** Nếu vi phạm → Bước 3 (Chia ca) chưa cân bằng tốt

### **Quan hệ với Bước 3:**
- Bước 3 (Chia ca) thực hiện logic chia ca cân bằng
- Nút "Kiểm tra" xác minh kết quả của Bước 3
- Nếu kiểm tra thất bại → Cần chạy lại Bước 3 hoặc sửa thủ công

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0  
**File code:** `src/app/api/distribution/validate/route.ts` (dòng 266-331)
