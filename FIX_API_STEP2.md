# 🔧 4 API Fix Tự Động - Bước 2

## 🎯 Tổng Quan

Sau khi nhấn nút **"🔍 Kiểm tra"** ở Bước 2 và phát hiện vi phạm, người dùng có thể nhấn nút **"🔧 Sửa"** để tự động sửa vi phạm. Có **4 API fix** tương ứng với 4 checks của Bước 2.

---

## 📋 Danh Sách 4 API Fix

| # | API Endpoint | Check ID | Mục Đích | Phương Pháp |
|---|--------------|----------|----------|-------------|
| 1 | `/api/distribution/fix-consecutive` | `consecutive_days` | Sửa vi phạm Giới hạn ngày làm liên tục | Swap X ↔ LP |
| 2 | `/api/distribution/fix-pn` | `pn_start_day` | Sửa vị trí PN (chuyển về sau ngày 15) | Đặt lại PN |
| 3 | `/api/distribution/fix-pn-count` | `pn_count` | Sửa số ngày PN (đúng Phân bổ PN = Phép năm) | Thêm/Bớt PN |
| 4 | `/api/distribution/fix-lp-balance` | `lp_balance` | Cân bằng LP trong phòng | Thêm/Bớt LP |

---

## 🔧 API 1: Fix Consecutive Days

### **Endpoint:** `POST /api/distribution/fix-consecutive`

### **Mục đích:**
Sửa vi phạm Giới hạn ngày làm liên tục (> 6 ngày) bằng cách **swap X ↔ LP** để giữ nguyên tổng số ngày làm và ngày nghỉ.

### **Logic:**

```typescript
// 1. Tìm NV có run X > maxConsecutiveDays (6 ngày)
let run = initialLastZeros; // Xét cả ngày làm cuối tháng trước
for (let i = 0; i < daysInMonth; i++) {
  if (isWork(arr[i])) { // dayType = 0
    run++;
    if (run > max) {
      // VI PHẠM! Cần chèn LP vào vị trí thứ max+1 trong run
      const insertPos = Math.max(0, runStart + max);
      
      // 2. Tìm LP để swap
      // Ưu tiên: LP ngay sau run → LP trước run
      let lpIdx = -1;
      for (let j = i + 1; j < daysInMonth; j++) {
        if (arr[j] === 1) { lpIdx = j; break; }
      }
      if (lpIdx === -1) {
        for (let j = runStart - 1; j >= 0; j--) {
          if (arr[j] === 1) { lpIdx = j; break; }
        }
      }
      
      // 3. Swap: X ↔ LP
      if (lpIdx !== -1) {
        arr[insertPos] = 1; // X → LP
        arr[lpIdx] = 0;     // LP → X
        // Ghi vào DB
      }
    }
  } else {
    run = 0; // Reset khi gặp ngày nghỉ (LP, PN, NL...)
  }
}
```

### **Ví dụ:**

**Trước khi sửa:**
```
NV001: X X X X X X X LP X X
       ↑─────────────↑
       7 ngày liên tiếp → VI PHẠM
```

**Sau khi sửa:**
```
NV001: X X X X X X LP X X X
       ↑─────────↑
       6 ngày OK, LP được chèn vào vị trí thứ 7
```

### **Đặc điểm:**
- ✅ Giữ nguyên tổng X và LP (chỉ swap vị trí)
- ✅ Xét `ngayNghiCuoiThangTruoc` để phát hiện vi phạm xuyên tháng
- ✅ PN (dayType=2) cũng được coi là ngày nghỉ → reset run
- ✅ Lặp tối đa 50 lần cho mỗi NV để sửa hết vi phạm
- ⚠️ Nếu không có LP để swap → không sửa được

### **Response:**
```json
{
  "ok": true,
  "fixed": 15,        // Số NV đã sửa thành công
  "total": 20,        // Tổng số NV vi phạm
  "changes": 30,      // Số thay đổi (mỗi swap = 2 changes)
  "unresolved": [     // NV vẫn còn vi phạm (không có LP để swap)
    { "code": "NV001", "name": "Nguyễn Văn A", "deptName": "IT" }
  ]
}
```

---

## 🔧 API 2: Fix PN Position

### **Endpoint:** `POST /api/distribution/fix-pn`

### **Mục đích:**
Sửa vị trí PN (chuyển PN trước ngày 15 về sau ngày 15) bằng cách **đặt lại PN** vào cuối kỳ nghỉ.

### **Logic:**

```typescript
// 1. Tìm NV có PN trước pnStartFromDay (15)
const pnDays = days.filter(d => d.dayType === 2).map(d => d.day);
const violated = pnDays.some(d => d < params.pnStartFromDay);

if (violated) {
  // 2. Chuyển tất cả PN → LP tạm
  const arrangement = days.map(d => {
    if (d.dayType === 2) return 1; // PN → LP
    return d.dayType;
  });
  
  // 3. Dùng placePNAtEndOfRestPeriod để đặt lại PN đúng vị trí
  const fixed = placePNAtEndOfRestPeriod(
    arrangement, 
    daysInMonth, 
    params, 
    phepNam
  );
  
  // 4. Ghi lại vào DB
  for (let i = 0; i < daysInMonth; i++) {
    if (fixed[i] !== arrangement[i]) {
      // UPDATE distribution_results
    }
  }
}
```

### **Hàm `placePNAtEndOfRestPeriod`:**
- Tìm chuỗi LP dài nhất từ ngày 15 trở đi
- Đặt PN vào ngày **CUỐI** của chuỗi LP đó
- Đảm bảo LP liền trước PN (swap nếu cần)

### **Ví dụ:**

**Trước khi sửa:**
```
NV001: X X X X X X LP LP PN X X X X X X LP LP LP LP X X
       Ngày 1                ↑
                          Ngày 9 = PN → VI PHẠM (trước ngày 15)
```

**Sau khi sửa:**
```
NV001: X X X X X X LP LP LP X X X X X X LP LP LP PN X X
       Ngày 1                                      ↑
                                               Ngày 19 = PN (cuối chuỗi LP dài nhất)
```

### **Đặc điểm:**
- ✅ Giữ nguyên tổng số ngày PN
- ✅ PN luôn rơi vào cuối kỳ nghỉ (sau chuỗi LP)
- ✅ Default ngày không có data = LP (không tạo ngày làm giả)
- ⚠️ Nếu không có chuỗi LP nào từ ngày 15 → đặt PN vào ngày LP cuối tháng

### **Response:**
```json
{
  "ok": true,
  "fixed": 8,   // Số NV đã sửa
  "total": 8    // Tổng số NV vi phạm
}
```

---

## 🔧 API 3: Fix PN Count

### **Endpoint:** `POST /api/distribution/fix-pn-count`

### **Mục đích:**
Sửa số ngày PN trong tháng cho đúng bằng `phepNam` của NV (thêm hoặc bớt PN).

### **Logic:**

```typescript
// 1. Tính chênh lệch
const pnDays = days.filter(d => d.dayType === 2);
const diff = pnDays.length - emp.phepNam;

if (diff > 0) {
  // 2a. THỪA PN: đổi PN thừa → LP
  // Ưu tiên xóa PN ở đầu tháng
  const toRemove = diff;
  for (const pnDay of pnDays.sort((a, b) => a - b)) {
    if (toRemove <= 0) break;
    arr[pnDay - 1] = 1; // PN → LP
    // UPDATE distribution_results
  }
  
} else if (diff < 0) {
  // 2b. THIẾU PN: dùng placePNAtEndOfRestPeriod để thêm
  const needed = -diff;
  
  // Xóa PN hiện có
  for (let i = 0; i < daysInMonth; i++) {
    if (arr[i] === 2) arr[i] = 1; // PN → LP tạm
  }
  
  // Đặt lại đúng số PN
  const fixed = placePNAtEndOfRestPeriod(
    arr, 
    daysInMonth, 
    params, 
    emp.phepNam
  );
  
  // Ghi lại vào DB
}
```

### **Ví dụ:**

**Trường hợp 1: Thừa PN**
```
NV001: phepNam = 1, nhưng có 2 ngày PN
Trước: X X X X X X LP LP PN X X X X X X LP LP PN X X
                        ↑                      ↑
                     Ngày 9                 Ngày 18
Sau:   X X X X X X LP LP LP X X X X X X LP LP PN X X
                        ↑                      ↑
                    PN→LP                  Giữ PN
```

**Trường hợp 2: Thiếu PN**
```
NV002: phepNam = 2, nhưng chỉ có 1 ngày PN
Trước: X X X X X X LP LP PN X X X X X X LP LP LP LP X X
                        ↑
                     Chỉ 1 PN
Sau:   X X X X X X LP LP PN X X X X X X LP LP LP PN X X
                        ↑                         ↑
                     PN cũ                    PN mới (thêm)
```

### **Đặc điểm:**
- ✅ Đảm bảo số PN Phân bổ PN = Phép năm
- ✅ Thừa PN: xóa từ đầu tháng
- ✅ Thiếu PN: thêm vào cuối kỳ nghỉ (dùng `placePNAtEndOfRestPeriod`)
- ✅ Batch update trong transaction

### **Response:**
```json
{
  "ok": true,
  "fixed": 12,  // Số NV đã sửa
  "total": 15   // Tổng số NV vi phạm
}
```

---

## 🔧 API 4: Fix LP Balance (CHỈ CẢNH BÁO)

### **Endpoint:** `POST /api/distribution/fix-lp-balance`

### ⚠️ **QUAN TRỌNG:**
**API này KHÔNG tự động sửa, chỉ trả về danh sách vi phạm.**

**Lý do:**
- Sửa tự động sẽ thay đổi workdays của NV
- Vi phạm dữ liệu gốc từ file import
- Ảnh hưởng lương tháng

### **Mục đích:**
Kiểm tra cân bằng số người nghỉ/làm THEO TỪNG NGÀY trong phòng.

### **Logic kiểm tra (ĐÃ SỬA):**

```typescript
// Với mỗi phòng, kiểm tra từng ngày
for (let day = 1; day <= daysInMonth; day++) {
  let workCount = 0;  // Số người làm (X)
  let restCount = 0;  // Số người nghỉ (LP, PN, NL...)
  
  for (const member of deptMembers) {
    const dayType = getDayType(member, day);
    if (dayType === 0) workCount++;
    else restCount++;
  }
  
  // Tính chênh lệch
  const diff = Math.abs(workCount - restCount);
  const maxAllowedDiff = Math.max(
    Math.floor(total * 0.4),  // 40%
    params.maxDayOffDifference // hoặc tham số
  );
  
  if (diff > maxAllowedDiff) {
    // VI PHẠM!
    violations.push({
      deptName, day, workCount, restCount, diff
    });
  }
}
```

### **Logic:**

```typescript
// 1. Nhóm NV theo phòng ban (bỏ qua BGD)
const deptGroups = new Map<string, string[]>();
for (const emp of emps) {
  if (!skipCodes.has(emp.deptCode)) {
    deptGroups.get(emp.deptId).push(emp.empId);
  }
}

// 2. Tính target LP = median của phòng
for (const [deptId, members] of deptGroups) {
  const lpCounts = members.map(id => countLP(id));
  const sorted = [...lpCounts].sort((a, b) => a - b);
  const target = sorted[Math.floor(sorted.length / 2)];
  
  // 3. Điều chỉnh từng NV về target
  for (const empId of members) {
    const currentLP = countLP(empId);
    
    if (currentLP > target) {
      // 3a. QUÁ NHIỀU LP: đổi LP → X
      // Ưu tiên LP ở đầu tháng (ít ảnh hưởng consecutive)
      let toRemove = currentLP - target;
      for (let i = 0; i < daysInMonth && toRemove > 0; i++) {
        if (arr[i] !== 1) continue;
        
        // Kiểm tra: đổi LP→X có tạo run X > 6 không?
        if (wouldViolateConsec(arr, i, maxConsecutiveDays)) continue;
        
        arr[i] = 0; // LP → X
        toRemove--;
      }
      
    } else if (currentLP < target) {
      // 3b. QUÁ ÍT LP: đổi X → LP
      // Ưu tiên X ở cuối tháng (tránh tạo run dài ở đầu)
      let toAdd = target - currentLP;
      for (let i = daysInMonth - 1; i >= 0 && toAdd > 0; i--) {
        if (arr[i] !== 0) continue; // Chỉ đổi ngày X thuần
        
        arr[i] = 1; // X → LP
        toAdd--;
      }
    }
  }
}
```

### **Hàm `wouldViolateConsec`:**
```typescript
// Kiểm tra nếu đổi LP→X tại vị trí i có tạo run X > max không
const wouldViolateConsec = (arr: number[], i: number, max: number): boolean => {
  // Đếm X liền kề bên trái
  let left = 0;
  for (let j = i - 1; j >= 0 && arr[j] === 0; j--) left++;
  
  // Đếm X liền kề bên phải
  let right = 0;
  for (let j = i + 1; j < arr.length && arr[j] === 0; j++) right++;
  
  // Nếu đổi LP→X, run = left + 1 + right
  return (left + 1 + right) > max;
};
```

### **Ví dụ:**

**Phòng IT có 3 NV:**
```
NV001: workdays=27, LP=3 (X=27, LP=3, tổng=30)
NV002: workdays=27, LP=4 (X=27, LP=4, tổng=31)
NV003: workdays=27, LP=5 (X=27, LP=5, tổng=32)

Chênh lệch: 5 - 3 = 2 ngày → VI PHẠM (> 1)
Target = median = 4 LP
```

**Sau khi sửa:**
```
NV001: LP 3→4 (X→LP) → workdays 27→26 ⚠️ (giảm 1 ngày làm!)
NV002: LP=4 → workdays=27 ✅ (không đổi)
NV003: LP 5→4 (LP→X) → workdays 27→28 ⚠️ (tăng 1 ngày làm!)

Chênh lệch: 4 - 4 = 0 ngày → OK
Nhưng workdays đã thay đổi! ❌
```

### **Đặc điểm:**
- ⚠️ **THAY ĐỔI workdays** (số ngày làm)
- ✅ Cân bằng theo median của phòng
- ✅ Kiểm tra consecutive trước khi đổi LP→X
- ✅ Chỉ đổi ngày X thuần (không đụng NL/Ô/TS/PN)
- ✅ Cập nhật arr ngay sau mỗi thay đổi
- ✅ Batch update trong transaction
- ⚠️ Bỏ qua phòng trong `skipEqualRestDeptCodes` (BGD)
- ❌ **Không khuyến nghị dùng** vì thay đổi dữ liệu gốc

### **Response:**
```json
{
  "ok": true,
  "fixed": 8,      // Số NV đã sửa
  "total": 3,      // Số phòng vi phạm
  "changes": 12    // Số thay đổi (LP↔X)
}
```

---

## 🔄 Flow Sử Dụng 4 API Fix

```
┌─────────────────────────────────────────────────────────┐
│ 1. Nhấn "🔍 Kiểm tra" → Phát hiện vi phạm              │
├─────────────────────────────────────────────────────────┤
│ • consecutive_days: 5 vi phạm                          │
│ • pn_start_day: 3 vi phạm                              │
│ • pn_count: 2 vi phạm                                  │
│ • lp_balance: 4 vi phạm                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Nhấn "🔧 Sửa vi phạm"                               │
├─────────────────────────────────────────────────────────┤
│ • Gọi 4 API fix tuần tự:                               │
│   1. fix-consecutive                                   │
│   2. fix-pn                                            │
│   3. fix-pn-count                                      │
│   4. fix-lp-balance                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Hiển thị kết quả                                    │
├─────────────────────────────────────────────────────────┤
│ • Đã sửa: 12/14 vi phạm                                │
│ • Còn lại: 2 vi phạm (không có LP để swap)             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Nhấn "🔄 Kiểm tra lại" để verify                    │
├─────────────────────────────────────────────────────────┤
│ • Gọi lại API validate                                 │
│ • Hiển thị kết quả mới                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 So Sánh 4 API Fix

| API | Phương Pháp | Giữ Nguyên Workdays | Có Thể Thất Bại | Độ Phức Tạp | Khuyến Nghị |
|-----|-------------|---------------------|-----------------|-------------|-------------|
| `fix-consecutive` | Swap X ↔ LP | ✅ | ✅ (không có LP) | O(n²) | ✅ An toàn |
| `fix-pn` | Đặt lại PN | ✅ | ❌ | O(n) | ✅ An toàn |
| `fix-pn-count` | Thêm/Bớt PN | ✅ | ❌ | O(n) | ✅ An toàn |
| `fix-lp-balance` | Thêm/Bớt LP | ❌ **THAY ĐỔI** | ⚠️ (consecutive) | O(n²) | ⚠️ Không khuyến nghị |

---

## 🎯 Kết Luận

**4 API Fix cho Bước 2:**

1. **fix-consecutive** ✅ - Sửa Giới hạn ngày làm liên tục (swap X ↔ LP) - **An toàn**
2. **fix-pn** ✅ - Sửa vị trí PN (đặt lại sau ngày 15) - **An toàn**
3. **fix-pn-count** ✅ - Sửa số ngày PN (thêm/bớt) - **An toàn**
4. **fix-lp-balance** ⚠️ - Cân bằng LP trong phòng - **KHÔNG khuyến nghị** (thay đổi workdays)

**Đặc điểm chung:**
- ✅ Tự động sửa vi phạm sau khi kiểm tra
- ✅ Batch update trong transaction
- ✅ Trả về số vi phạm đã sửa và còn lại
- ✅ Có thể chạy nhiều lần cho đến khi hết vi phạm
- ⚠️ Một số trường hợp không sửa được (cần sửa thủ công)

**Thứ tự chạy:** 1 → 2 → 3 (bỏ qua 4)

**Giải pháp cho `lp_balance`:**
- ✅ Normalize workdays TRƯỚC khi chạy Bước 2 (đã tự động trong API step/2)
- ✅ Nếu vẫn vi phạm → Sửa thủ công workdays trong bảng employees
- ✅ Hoặc chấp nhận chênh lệch 1-2 ngày (trong giới hạn cho phép)

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0
