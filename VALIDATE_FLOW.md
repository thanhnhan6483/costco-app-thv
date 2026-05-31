# 🔍 Flow Nút "Kiểm tra" - Validate Distribution

## 🎯 Tổng Quan

Nút **"Kiểm tra"** xuất hiện ở **Bước 2, 3, 4, 5** sau khi chạy xong bước đó. Nút này gọi API `/api/distribution/validate` để kiểm tra kết quả phân bổ có vi phạm quy tắc nào không.

---

## 📊 Flow Khi Nhấn Nút "Kiểm tra"

```
┌─────────────────────────────────────────────────────────┐
│ 1. UI: Người dùng nhấn nút "🔍 Kiểm tra"               │
├─────────────────────────────────────────────────────────┤
│ • Hiển thị spinner: "⏳ Đang kiểm tra..."              │
│ • Gọi API: GET /api/distribution/validate?month=xxx    │
│ • Truyền onlyIds để lọc check theo bước                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. API: Load dữ liệu từ DB                             │
├─────────────────────────────────────────────────────────┤
│ • Load params từ alloc_rules                           │
│ • Load employees + departments                         │
│ • Load distribution_results (kết quả phân bổ)          │
│ • Group theo empId                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. API: Chạy 13 checks (tùy theo onlyIds)             │
├─────────────────────────────────────────────────────────┤
│ • Mỗi check duyệt qua tất cả NV                        │
│ • Tìm vi phạm theo quy tắc                             │
│ • Ghi lại: code, name, deptName, day, detail           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. API: Trả về kết quả JSON                            │
├─────────────────────────────────────────────────────────┤
│ {                                                       │
│   monthId, totalEmps, totalViolations,                 │
│   overallStatus: 'ok' | 'warning' | 'error',           │
│   results: [                                           │
│     {                                                   │
│       id: 'consecutive_days',                          │
│       label: 'Giới hạn ngày làm liên tục',                     │
│       status: 'error',                                 │
│       violations: [                                    │
│         { code, name, deptName, day, detail }          │
│       ],                                               │
│       violationCount: 5                                │
│     }                                                  │
│   ]                                                    │
│ }                                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. UI: Hiển thị kết quả                                │
├─────────────────────────────────────────────────────────┤
│ • Nếu overallStatus = 'ok':                            │
│   → Nút xanh: "✅ Đạt"                                 │
│ • Nếu overallStatus = 'error' hoặc 'warning':          │
│   → Nút đỏ: "❌ Xem vi phạm"                           │
│ • Nhấn nút → Mở ValidatePanel hiển thị chi tiết        │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Danh Sách 13 Checks

### 🔹 Bước 1: Xem dữ liệu (1 check)
| ID | Label | Mô Tả |
|----|-------|-------|
| `pn_start_day_import` | PN trong dữ liệu import (≥ ngày 15) | PN trong file import không được trước ngày `pnStartFromDay` |

### 🔹 Bước 2: Phân bổ ngày công (4 checks)
| ID | Label | Mô Tả | Tham Số |
|----|-------|-------|---------|
| `consecutive_days` | Giới hạn ngày làm liên tục (≤ 6 ngày) | Không quá `maxConsecutiveDays` Giới hạn ngày làm liên tục | `max_consecutive_days = 6` |
| `pn_start_day` | Vị trí phép năm (≥ ngày 15) | PN chỉ được xếp từ ngày `pnStartFromDay` trở đi | `pn_start_from_day = 15` |
| `pn_count` | Số ngày phép năm (Phân bổ PN = Phép năm) | Số ngày PN trong tháng phải đúng bằng `phepNam` của NV | `phepNam` (từ employees) |
| `lp_balance` | Cân bằng ngày nghỉ trong phòng (chênh ≤ 1 ngày) | Số ngày LP giữa NV cùng phòng chênh ≤ `maxDayOffDifference` | `max_day_off_difference = 1` |

### 🔹 Bước 3: Chia ca (2 checks)
| ID | Label | Mô Tả |
|----|-------|-------|
| `shift_assigned` | Chia ca (100% ngày làm có ca) | Tất cả ngày làm (X) phải được gán ca (Ca 1 / Ca 2) |
| `shift_balance` | Cân bằng ca trong phòng (chênh ≤ 1 NV) | Số NV Ca1 và Ca2 trong cùng phòng mỗi ngày chênh ≤ 1 |

### 🔹 Bước 4: Tăng ca/Đi trễ (7 checks)
| ID | Label | Mô Tả | Tham Số |
|----|-------|-------|---------|
| `ot_max_per_day` | Tăng ca tối đa/ngày (≤ 4h) | OT không quá `maxOtPerDayHours` h/ngày | `max_ot_per_day_hours = 4` |
| `ot_start_day` | Tăng ca từ ngày thứ mấy (≥ ngày 15) | OT chỉ phân bổ từ ngày `otStartFromDay` | `ot_distribution_start_day = 15` |
| `ot_min_per_day` | Tăng ca tối thiểu/ngày (≥ 60 phút) | Nếu có OT thì ≥ `minOtPerDayMinutes` phút | `min_ot_per_day_minutes = 60` |
| `ot_balance` | OT cân bằng trong phòng (chênh ≤ 30 phút) | Chênh lệch OT giữa NV cùng phòng ≤ `maxOtBalanceDiffMinutes` | `max_ot_balance_diff_minutes = 30` |
| `ot_between_rest` | OT tối đa giữa 2 ngày nghỉ (≤ 12h) | Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ `maxOtBetweenRestHours` | `max_ot_between_rest_hours = 12` |
| `late_max_per_day` | Đi trễ tối đa/ngày (≤ 9 phút) | Trễ không quá `maxLatePerDayMinutes` phút/ngày | `max_late_per_day_minutes = 9` |
| `late_start_day` | Trễ từ ngày thứ mấy (≥ ngày 15) | Trễ chỉ phân bổ từ ngày `lateStartFromDay` | `late_distribution_start_day = 15` |

### 🔹 Bước 5: Giờ vào/ra (1 check)
| ID | Label | Mô Tả |
|----|-------|-------|
| `check_time` | Giờ vào/ra (checkIn < checkOut) | Ngày làm phải có giờ vào/ra hợp lệ (checkIn < checkOut) |

---

## 🔍 Chi Tiết Từng Check

### ✅ Check 1: `consecutive_days` (Giới hạn ngày làm liên tục ≤ 6 ngày)

**Mục đích:** Đảm bảo không có NV nào làm quá 6 ngày liên tiếp

**Logic:**
```typescript
let run = 0; // Đếm số Giới hạn ngày làm liên tục
for (let d = 1; d <= daysInMonth; d++) {
  if (dayType === 0) { // Ngày làm (X)
    run++;
    if (run > params.maxConsecutiveDays) {
      // VI PHẠM!
      violations.push({
        code: emp.code,
        name: emp.name,
        deptName: deptName,
        day: runStart,
        detail: `${run} Giới hạn ngày làm liên tục từ ngày ${runStart} (vượt giới hạn ${params.maxConsecutiveDays})`
      });
    }
  } else { // Ngày nghỉ
    run = 0; // Reset
  }
}
```

**Ví dụ vi phạm:**
- NV001: X X X X X X X (7 ngày liên tiếp) → VI PHẠM
- NV002: X X X X X X LP X X (6 ngày OK, sau đó reset)

---

### ✅ Check 2: `pn_start_day` (Vị trí phép năm ≥ ngày 15)

**Mục đích:** PN chỉ được đặt từ ngày 15 trở đi

**Logic:**
```typescript
for (const d of emp.days) {
  if (d.dayType === 2 && d.day < params.pnStartFromDay) {
    // VI PHẠM!
    violations.push({
      code: emp.code,
      name: emp.name,
      deptName: deptName,
      day: d.day,
      detail: `PN tại ngày ${d.day} (trước ngày ${params.pnStartFromDay})`
    });
  }
}
```

**Ví dụ vi phạm:**
- NV001: Ngày 10 = PN → VI PHẠM (trước ngày 15)
- NV002: Ngày 20 = PN → OK

---

### ✅ Check 3: `pn_count` (Số ngày phép năm Phân bổ PN = Phép năm)

**Mục đích:** Số ngày PN trong tháng phải đúng bằng `phepNam` của NV

**Logic:**
```typescript
const pnCount = emp.days.filter(d => d.dayType === 2).length;
if (pnCount !== emp.phepNam) {
  // VI PHẠM!
  violations.push({
    code: emp.code,
    name: emp.name,
    deptName: deptName,
    day: 0,
    detail: `Có ${pnCount} ngày PN, cần ${emp.phepNam}`
  });
}
```

**Ví dụ vi phạm:**
- NV001: phepNam=1, nhưng có 2 ngày PN → VI PHẠM
- NV002: phepNam=2, có 2 ngày PN → OK

---

### ✅ Check 4: `lp_balance` (Cân bằng ngày nghỉ trong phòng - chênh ≤ 1 ngày)

**Mục đích:** Số ngày LP giữa NV cùng phòng chênh ≤ 1

**Logic:**
```typescript
// Nhóm NV theo phòng ban
const deptEmps = new Map<string, { code, name, lpCount }[]>();
for (const emp of emps) {
  const lpCount = emp.days.filter(d => d.dayType === 1).length;
  deptEmps.get(emp.deptId).push({ code: emp.code, name: emp.name, lpCount });
}

// Kiểm tra chênh lệch
for (const [deptId, members] of deptEmps) {
  const minLP = Math.min(...members.map(m => m.lpCount));
  const maxLP = Math.max(...members.map(m => m.lpCount));
  if (maxLP - minLP > params.maxDayOffDifference) {
    // VI PHẠM!
    violations.push({
      code: '—',
      name: `📊 ${deptName}`,
      deptName: deptName,
      day: 0,
      detail: `${members.length} NV — ngày LP thấp nhất ${minLP}, cao nhất ${maxLP}, chênh ${maxLP - minLP} ngày`
    });
  }
}
```

**Ví dụ vi phạm:**
- Phòng A: NV001=3 LP, NV002=4 LP, NV003=5 LP → Chênh 2 ngày → VI PHẠM
- Phòng B: NV004=4 LP, NV005=5 LP → Chênh 1 ngày → OK

---

### ✅ Check 5: `shift_assigned` (Chia ca - 100% ngày làm có ca)

**Mục đích:** Tất cả ngày làm phải được gán ca

**Logic:**
```typescript
for (const d of emp.days) {
  if (d.dayType === 0 && !d.shiftCode) {
    // VI PHẠM!
    violations.push({
      code: emp.code,
      name: emp.name,
      deptName: deptName,
      day: d.day,
      detail: `Ngày ${d.day}: ngày làm chưa được gán ca`
    });
    break; // 1 vi phạm/NV là đủ
  }
}
```

---

### ✅ Check 6: `shift_balance` (Cân bằng ca trong phòng - chênh ≤ 1 NV)

**Mục đích:** Số NV Ca1 và Ca2 trong cùng phòng mỗi ngày chênh ≤ 1

**Logic:**
```typescript
// Đếm số NV Ca1/Ca2 mỗi ngày theo phòng
const deptDayShift = new Map<string, Map<number, { c1, c2 }>>();
for (const emp of emps) {
  for (const d of emp.days) {
    if (d.dayType === 0 && d.shiftCode) {
      if (d.shiftCode === 'C1') stat.c1++;
      else if (d.shiftCode === 'C2') stat.c2++;
    }
  }
}

// Kiểm tra chênh lệch
for (const [day, stat] of dayMap) {
  const diff = Math.abs(stat.c1 - stat.c2);
  if (diff > 1) {
    // VI PHẠM!
    violations.push({
      code: '—',
      name: deptName,
      deptName: deptName,
      day: day,
      detail: `Ngày ${day}: Ca1=${stat.c1}, Ca2=${stat.c2} (chênh ${diff})`
    });
  }
}
```

**Ví dụ vi phạm:**
- Phòng A, Ngày 5: Ca1=10 NV, Ca2=5 NV → Chênh 5 → VI PHẠM
- Phòng B, Ngày 10: Ca1=8 NV, Ca2=9 NV → Chênh 1 → OK

---

### ✅ Check 7-12: OT và Trễ

Các check này tương tự, kiểm tra:
- OT/Trễ không vượt giới hạn max/ngày
- OT/Trễ chỉ từ ngày quy định
- OT tối thiểu (nếu có OT)
- OT cân bằng trong phòng
- OT tối đa giữa 2 ngày nghỉ

---

### ✅ Check 13: `check_time` (Giờ vào/ra - checkIn < checkOut)

**Mục đích:** Ngày làm phải có giờ vào/ra hợp lệ

**Logic:**
```typescript
for (const d of emp.days) {
  if (d.dayType === 0) {
    if (!d.checkIn || !d.checkOut) {
      // VI PHẠM: Thiếu giờ
      violations.push({ ..., detail: `Ngày ${d.day}: thiếu giờ vào/ra` });
    }
    if (toMins(d.checkIn) >= toMins(d.checkOut)) {
      // VI PHẠM: Giờ vào >= giờ ra
      violations.push({ ..., detail: `Ngày ${d.day}: giờ vào (${d.checkIn}) ≥ giờ ra (${d.checkOut})` });
    }
  }
}
```

---

## 🎨 UI Hiển Thị Kết Quả

### 1️⃣ Nút "Kiểm tra" (trước khi chạy)
```
┌──────────────────┐
│ 🔍 Kiểm tra      │
└──────────────────┘
```

### 2️⃣ Đang chạy
```
┌──────────────────────────┐
│ ⏳ Đang kiểm tra...      │
└──────────────────────────┘
```

### 3️⃣ Kết quả: Đạt (overallStatus = 'ok')
```
┌──────────────────┐
│ ✅ Đạt           │  (nền xanh)
└──────────────────┘
```

### 4️⃣ Kết quả: Vi phạm (overallStatus = 'error' hoặc 'warning')
```
┌──────────────────────┐
│ ❌ Xem vi phạm       │  (nền đỏ)
└──────────────────────┘
```

### 5️⃣ ValidatePanel (khi nhấn "Xem vi phạm")
```
╔═══════════════════════════════════════════════════════╗
║ 🔍 Kiểm tra quy tắc ngày công                        ║
║ Kiểm tra 4 quy tắc: Giới hạn ngày làm liên tục, vị trí PN... ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║ ✅ Giới hạn ngày làm liên tục (0 vi phạm)                    ║
║ ❌ Vị trí phép năm (5 vi phạm)                       ║
║    • NV001 - Nguyễn Văn A - Phòng IT                 ║
║      Ngày 10: PN tại ngày 10 (trước ngày 15)        ║
║    • NV002 - Trần Thị B - Phòng KT                   ║
║      Ngày 12: PN tại ngày 12 (trước ngày 15)        ║
║    ...                                                ║
║                                                       ║
║ ⚠️ Cân bằng ngày nghỉ trong phòng (3 vi phạm)       ║
║    • 📊 Phòng IT                                     ║
║      10 NV — ngày LP thấp nhất 3, cao nhất 5, chênh 2║
║    ...                                                ║
║                                                       ║
║ [🔄 Kiểm tra lại]  [🔧 Sửa vi phạm]                  ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🔧 Nút "Sửa" (Fix Violations)

Sau khi kiểm tra, nếu có vi phạm, có thể nhấn nút **"Sửa"** để tự động sửa:

### Bước 2: 4 API fix
1. `/api/distribution/fix-consecutive` - Sửa vi phạm Giới hạn ngày làm liên tục
2. `/api/distribution/fix-pn` - Sửa vị trí PN (chuyển về sau ngày 15)
3. `/api/distribution/fix-pn-count` - Sửa số ngày PN
4. `/api/distribution/fix-lp-balance` - Sửa cân bằng LP trong phòng

### Bước 3, 4, 5: Chưa có API fix tự động
- Cần sửa thủ công hoặc chạy lại bước

---

## 📊 Tóm Tắt

| Bước | Số Checks | onlyIds | Mục Đích |
|------|-----------|---------|----------|
| 1 | 1 | `pn_start_day_import` | Kiểm tra dữ liệu import |
| 2 | 4 | `consecutive_days`, `pn_start_day`, `pn_count`, `lp_balance` | Kiểm tra quy tắc ngày công |
| 3 | 2 | `shift_assigned`, `shift_balance` | Kiểm tra chia ca |
| 4 | 7 | `ot_max_per_day`, `ot_start_day`, `ot_min_per_day`, `ot_balance`, `ot_between_rest`, `late_max_per_day`, `late_start_day` | Kiểm tra OT/Trễ |
| 5 | 1 | `check_time` | Kiểm tra giờ vào/ra |

**Tổng cộng: 13 checks**

---

## 🎯 Kết Luận

Nút **"Kiểm tra"** giúp:
1. ✅ Xác định vi phạm quy tắc sau khi phân bổ
2. 📊 Hiển thị chi tiết vi phạm (NV nào, ngày nào, lý do gì)
3. 🔧 Hỗ trợ sửa tự động (Bước 2) hoặc thủ công
4. 🔄 Kiểm tra lại sau khi sửa

**Flow:** Chạy bước → Kiểm tra → Sửa vi phạm → Kiểm tra lại → Hoàn tất

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0
