# 🔍 Kiểm Tra OT và Late (Validate OT & Late)

## 🎯 Tổng Quan

Nút "Kiểm tra" tại Bước 4 thực hiện **9 kiểm tra** liên quan đến OT và Late:

### **Kiểm tra OT (7 checks):**
1. ✅ **Check 4:** OT tối đa/ngày (≤ maxOtPerDayHours)
2. ✅ **Check 5:** OT từ ngày thứ mấy (≥ otStartFromDay)
3. ✅ **Check QT7:** OT tối thiểu/ngày (≥ minOtPerDayMinutes) ← **BẠN HỎI**
4. ✅ **Check QT8:** OT cân bằng trong phòng (chênh ≤ maxOtBalanceDiffMinutes) ← **BẠN HỎI**
5. ✅ **Check QT9:** OT tối đa giữa 2 ngày nghỉ (≤ maxOtBetweenRestHours) ← **BẠN HỎI**

### **Kiểm tra Late (2 checks):**
6. ✅ **Check 6:** Late tối đa/ngày (≤ maxLatePerDayMinutes)
7. ✅ **Check 7:** Late từ ngày thứ mấy (≥ lateStartFromDay)

---

## 📋 Chi Tiết Các Check

### **✅ Check QT7: OT Tối Thiểu/Ngày**

**Mục đích:** Nếu có OT thì phải ≥ minOtPerDayMinutes (thường = 60 phút)

**Code:**
```typescript
const checkQt7: CheckResult = {
  id: 'ot_min_per_day',
  label: `Tăng ca tối thiểu/ngày (≥ ${params.minOtPerDayMinutes} phút)`,
  description: `Nếu có OT thì phải ≥ ${params.minOtPerDayMinutes} phút/ngày`,
  status: 'ok',
  violations: [],
  violationCount: 0,
  checkedCount: totalEmps,
};

if (params.minOtPerDayMinutes > 0) {
  const minOtH = params.minOtPerDayMinutes / 60;
  
  for (const emp of emps) {
    const deptName = deptMap.get(emp.deptId)?.name ?? '—';
    
    for (const d of emp.days) {
      // Kiểm tra: Nếu có OT nhưng < min
      if (d.otHours > 0 && d.otHours < minOtH) {
        checkQt7.violations.push({
          code: emp.code,
          name: emp.name,
          deptName,
          day: d.day,
          detail: `OT ngày ${d.day}: ${Math.round(d.otHours * 60)}ph (dưới tối thiểu ${params.minOtPerDayMinutes}ph)`,
        });
      }
    }
  }
}

checkQt7.violationCount = checkQt7.violations.length;
checkQt7.status = checkQt7.violationCount === 0 ? 'ok' : 'error';
results.push(checkQt7);
```

**Ví dụ vi phạm:**
```
NV001 - Ngày 15:
- OT: 0.5h (30 phút)
- Min: 60 phút
→ ❌ VI PHẠM: "OT ngày 15: 30ph (dưới tối thiểu 60ph)"
```

**Ví dụ OK:**
```
NV001 - Ngày 15:
- OT: 1.5h (90 phút)
- Min: 60 phút
→ ✅ OK

NV002 - Ngày 16:
- OT: 0h (không có OT)
→ ✅ OK (không kiểm tra nếu OT = 0)
```

---

### **✅ Check QT8: OT Cân Bằng Trong Phòng**

**Mục đích:** Chênh lệch OT giữa NV cùng phòng ≤ maxOtBalanceDiffMinutes (thường = 30 phút)

**Code:**
```typescript
const checkQt8: CheckResult = {
  id: 'ot_balance',
  label: `OT cân bằng trong phòng (chênh ≤ ${params.maxOtBalanceDiffMinutes} phút)`,
  description: `Chênh lệch OT giữa NV cùng phòng ≤ ${params.maxOtBalanceDiffMinutes} phút/ngày`,
  status: 'ok',
  violations: [],
  violationCount: 0,
  checkedCount: totalEmps,
};

const maxDiffH = params.maxOtBalanceDiffMinutes / 60;

// 1. Nhóm OT theo phòng và ngày
// deptDayOT[deptId][day] = [otHours1, otHours2, ...]
const deptDayOT = new Map<string, Map<number, number[]>>();

for (const emp of emps) {
  for (const d of emp.days) {
    // Chỉ kiểm tra ngày làm có OT
    if (d.dayType !== 0 || d.otHours <= 0) continue;
    
    if (!deptDayOT.has(emp.deptId)) {
      deptDayOT.set(emp.deptId, new Map());
    }
    const dm = deptDayOT.get(emp.deptId)!;
    
    if (!dm.has(d.day)) {
      dm.set(d.day, []);
    }
    dm.get(d.day)!.push(d.otHours);
  }
}

// 2. Kiểm tra chênh lệch cho từng phòng, từng ngày
for (const [deptId, dayMap] of deptDayOT) {
  const deptName = deptMap.get(deptId)?.name ?? '—';
  
  for (const [day, otList] of dayMap) {
    // Bỏ qua nếu chỉ có 1 NV
    if (otList.length < 2) continue;
    
    // Tính chênh lệch
    const maxOt = Math.max(...otList);
    const minOt = Math.min(...otList);
    const diff = maxOt - minOt;
    
    // Nếu chênh > maxDiffH → Vi phạm
    if (diff > maxDiffH) {
      checkQt8.violations.push({
        code: '—',
        name: deptName,
        deptName,
        day,
        detail: `Ngày ${day}: OT chênh ${Math.round(diff * 60)}ph (max ${params.maxOtBalanceDiffMinutes}ph) — [${otList.map(h => Math.round(h * 60) + 'ph').join(', ')}]`,
      });
    }
  }
}

checkQt8.violationCount = checkQt8.violations.length;
checkQt8.status = checkQt8.violationCount === 0 ? 'ok' : 'warning';
results.push(checkQt8);
```

**Ví dụ vi phạm:**
```
Phòng Sản Xuất - Ngày 15:
- NV001: 4h OT (240 phút)
- NV002: 2h OT (120 phút)
- NV003: 1h OT (60 phút)

Chênh lệch: 240 - 60 = 180 phút > 30 phút
→ ❌ VI PHẠM: "Ngày 15: OT chênh 180ph (max 30ph) — [240ph, 120ph, 60ph]"
```

**Ví dụ OK:**
```
Phòng Sản Xuất - Ngày 16:
- NV001: 2.5h OT (150 phút)
- NV002: 2.25h OT (135 phút)
- NV003: 2h OT (120 phút)

Chênh lệch: 150 - 120 = 30 phút ≤ 30 phút
→ ✅ OK
```

---

### **✅ Check QT9: OT Tối Đa Giữa 2 Ngày Nghỉ**

**Mục đích:** Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ maxOtBetweenRestHours (thường = 12 giờ)

**Code:**
```typescript
const checkQt9: CheckResult = {
  id: 'ot_between_rest',
  label: `OT tối đa giữa 2 ngày nghỉ (≤ ${params.maxOtBetweenRestHours}h)`,
  description: `Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ ${params.maxOtBetweenRestHours}h`,
  status: 'ok',
  violations: [],
  violationCount: 0,
  checkedCount: totalEmps,
};

for (const emp of emps) {
  const deptName = deptMap.get(emp.deptId)?.name ?? '—';
  
  // Chia thành các "kỳ" (period) giữa 2 ngày nghỉ
  let periodOT = 0;
  let periodStart = 1;
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = emp.days.find(x => x.day === d);
    
    if (!dayData || dayData.dayType !== 0) {
      // Ngày nghỉ → kết thúc kỳ
      if (periodOT > params.maxOtBetweenRestHours) {
        checkQt9.violations.push({
          code: emp.code,
          name: emp.name,
          deptName,
          day: periodStart,
          detail: `OT từ ngày ${periodStart}–${d - 1}: ${periodOT.toFixed(1)}h (vượt ${params.maxOtBetweenRestHours}h)`,
        });
      }
      periodOT = 0;
      periodStart = d + 1;
    } else {
      // Ngày làm → cộng OT vào kỳ
      periodOT += dayData.otHours;
    }
  }
  
  // Kiểm tra kỳ cuối tháng (nếu tháng kết thúc bằng ngày làm)
  if (periodOT > params.maxOtBetweenRestHours) {
    checkQt9.violations.push({
      code: emp.code,
      name: emp.name,
      deptName,
      day: periodStart,
      detail: `OT từ ngày ${periodStart}–${daysInMonth}: ${periodOT.toFixed(1)}h (vượt ${params.maxOtBetweenRestHours}h)`,
    });
  }
}

checkQt9.violationCount = checkQt9.violations.length;
checkQt9.status = checkQt9.violationCount === 0 ? 'ok' : 'error';
results.push(checkQt9);
```

**Ví dụ vi phạm:**
```
NV001:
- Ngày 1: LP (nghỉ)
- Ngày 2: X + 3h OT
- Ngày 3: X + 4h OT
- Ngày 4: X + 3h OT
- Ngày 5: X + 3.5h OT
- Ngày 6: LP (nghỉ)

Period từ ngày 2-5:
- Tổng OT: 3 + 4 + 3 + 3.5 = 13.5h > 12h
→ ❌ VI PHẠM: "OT từ ngày 2–5: 13.5h (vượt 12h)"
```

**Ví dụ OK:**
```
NV001:
- Ngày 1: LP (nghỉ)
- Ngày 2: X + 2h OT
- Ngày 3: X + 3h OT
- Ngày 4: X + 2.5h OT
- Ngày 5: X + 3h OT
- Ngày 6: LP (nghỉ)

Period từ ngày 2-5:
- Tổng OT: 2 + 3 + 2.5 + 3 = 10.5h ≤ 12h
→ ✅ OK
```

---

## 📊 Tổng Hợp Tất Cả Các Check OT & Late

| ID | Tên Check | Ràng buộc | Status nếu vi phạm |
|----|-----------|-----------|-------------------|
| **check4** | OT tối đa/ngày | ≤ maxOtPerDayHours (4h) | error |
| **check5** | OT từ ngày thứ mấy | ≥ otStartFromDay (15) | error |
| **checkQt7** | **OT tối thiểu/ngày** | **≥ minOtPerDayMinutes (60ph)** | **error** |
| **checkQt8** | **OT cân bằng trong phòng** | **chênh ≤ maxOtBalanceDiffMinutes (30ph)** | **warning** |
| **checkQt9** | **OT giữa 2 ngày nghỉ** | **≤ maxOtBetweenRestHours (12h)** | **error** |
| **check6** | Late tối đa/ngày | ≤ maxLatePerDayMinutes (9ph) | error |
| **check7** | Late từ ngày thứ mấy | ≥ lateStartFromDay (15) | error |

---

## 🎯 Trả Lời Câu Hỏi

### **Câu hỏi:** Nút "Kiểm tra" có hiển thị đủ 3 điều kiện không?

1. ✅ **Tăng ca tối thiểu/ngày (min_ot_per_day_minutes = 60 phút)**
   - **CÓ** - Check QT7
   - Label: "Tăng ca tối thiểu/ngày (≥ 60 phút)"
   - Description: "Nếu có OT thì phải ≥ 60 phút/ngày"

2. ✅ **OT cân bằng trong phòng (max_ot_balance_diff_minutes = 30 phút)**
   - **CÓ** - Check QT8
   - Label: "OT cân bằng trong phòng (chênh ≤ 30 phút)"
   - Description: "Chênh lệch OT giữa NV cùng phòng ≤ 30 phút/ngày"

3. ✅ **OT tối đa giữa 2 ngày nghỉ (max_ot_between_rest_hours = 12 giờ)**
   - **CÓ** - Check QT9
   - Label: "OT tối đa giữa 2 ngày nghỉ (≤ 12h)"
   - Description: "Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ 12h"

### **Kết luận:**
✅ **TẤT CẢ 3 điều kiện đều đã có trong nút "Kiểm tra"**

---

## 📝 Ví Dụ Kết Quả Kiểm Tra

```json
{
  "monthId": "month_jan2026",
  "totalEmps": 50,
  "totalViolations": 5,
  "overallStatus": "warning",
  "results": [
    {
      "id": "checkQt7",
      "label": "Tăng ca tối thiểu/ngày (≥ 60 phút)",
      "status": "error",
      "violationCount": 2,
      "violations": [
        {
          "code": "NV001",
          "name": "Nguyễn Văn A",
          "deptName": "Sản Xuất",
          "day": 15,
          "detail": "OT ngày 15: 30ph (dưới tối thiểu 60ph)"
        },
        {
          "code": "NV002",
          "name": "Trần Thị B",
          "deptName": "Sản Xuất",
          "day": 18,
          "detail": "OT ngày 18: 45ph (dưới tối thiểu 60ph)"
        }
      ]
    },
    {
      "id": "checkQt8",
      "label": "OT cân bằng trong phòng (chênh ≤ 30 phút)",
      "status": "warning",
      "violationCount": 1,
      "violations": [
        {
          "code": "—",
          "name": "Sản Xuất",
          "deptName": "Sản Xuất",
          "day": 20,
          "detail": "Ngày 20: OT chênh 180ph (max 30ph) — [240ph, 120ph, 60ph]"
        }
      ]
    },
    {
      "id": "checkQt9",
      "label": "OT tối đa giữa 2 ngày nghỉ (≤ 12h)",
      "status": "error",
      "violationCount": 2,
      "violations": [
        {
          "code": "NV003",
          "name": "Lê Văn C",
          "deptName": "Kế Toán",
          "day": 10,
          "detail": "OT từ ngày 10–14: 13.5h (vượt 12h)"
        },
        {
          "code": "NV004",
          "name": "Phạm Thị D",
          "deptName": "Nhân Sự",
          "day": 22,
          "detail": "OT từ ngày 22–28: 14.0h (vượt 12h)"
        }
      ]
    }
  ]
}
```

---

## 🔄 Flow Kiểm Tra

```
┌─────────────────────────────────────────────────────────┐
│ 1. Load dữ liệu từ distribution_results                 │
│    - employee_id, day, day_type, ot_hours, late_mins   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Load params từ alloc_rules                           │
│    - minOtPerDayMinutes, maxOtBalanceDiffMinutes, ...  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CHECK QT7: OT tối thiểu/ngày                         │
│    - Với mỗi NV, mỗi ngày có OT                         │
│    - Kiểm tra: otHours ≥ minOtH                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. CHECK QT8: OT cân bằng trong phòng                   │
│    - Nhóm OT theo phòng và ngày                         │
│    - Kiểm tra: max - min ≤ maxDiffH                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. CHECK QT9: OT giữa 2 ngày nghỉ                       │
│    - Chia thành các period                              │
│    - Kiểm tra: tổng OT mỗi period ≤ maxBetweenH        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Trả về kết quả                                       │
│    - overallStatus: ok / warning / error                │
│    - violations: danh sách vi phạm chi tiết             │
└─────────────────────────────────────────────────────────┘
```

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0  
**File code:** `src/app/api/distribution/validate/route.ts` (dòng 475-580)
