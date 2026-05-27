# 🔄 Giải Thích Logic SWAP X ↔ LP

## 📋 Tổng Quan

API `fix-lp-balance` sử dụng kỹ thuật **SWAP X ↔ LP giữa các NGÀY của cùng NV** để cân bằng số người nghỉ/làm theo từng ngày trong phòng ban.

## 🏷️ DayType Mapping

```typescript
// Định nghĩa các loại ngày (dayType)

// ✅ DỮ LIỆU TỰ SINH - CÓ THỂ THAY ĐỔI
0 = X   (Làm việc)
1 = LP  (Nghỉ lễ/Chủ nhật) ← CHỈ swap với loại này
2 = PN  (Phép năm) ← KHÔNG swap (giữ nguyên số ngày phép năm)

// ❌ DỮ LIỆU ĐẦU VÀO CỐ ĐỊNH - TUYỆT ĐỐI KHÔNG THAY ĐỔI
≥3 = Ô, TS, DS, O, NL, OF, P, ... (Tất cả các loại nghỉ đặc biệt)
```

**⚠️ QUAN TRỌNG:** 
- **CHỈ được thay đổi:** X (0), LP (1), PN (2) - là dữ liệu tự sinh ra từ giải thuật
- **TUYỆT ĐỐI KHÔNG thay đổi:** dayType ≥ 3 - là dữ liệu đầu vào cố định từ người dùng

---

## 🎯 Mục Tiêu

Đảm bảo mỗi ngày trong phòng ban có số người làm và nghỉ cân bằng, tránh tình trạng:
- Quá nhiều người nghỉ cùng ngày → Thiếu người làm việc
- Quá nhiều người làm cùng ngày → Không công bằng

---

## 🔧 Cách Hoạt Động

### **Ví dụ cụ thể:**

```
NV001 có lịch tháng 5:
Ngày 1: X (làm)
Ngày 2: X (làm)
Ngày 3: LP (nghỉ)  ← Ngày này phòng có 8/10 người nghỉ (vi phạm)
Ngày 4: X (làm)
Ngày 5: X (làm)
Ngày 6: X (làm)
Ngày 7: LP (nghỉ)
Ngày 8: Ô (ốm) ← DỮ LIỆU CỐ ĐỊNH, KHÔNG SWAP
...
Ngày 15: PN (phép năm) ← KHÔNG SWAP (giữ nguyên số PN)
...

→ Phát hiện: Ngày 3 có quá nhiều người nghỉ (8/10)
→ Giải pháp: SWAP ngày 3 ↔ ngày 6 của NV001

Sau khi swap:
Ngày 1: X
Ngày 2: X
Ngày 3: X (LP → X)  ← Giờ đi làm, giúp cân bằng
Ngày 4: X
Ngày 5: X
Ngày 6: LP (X → LP) ← Giờ nghỉ
Ngày 7: LP
Ngày 8: Ô (KHÔNG ĐỔI) ← Dữ liệu cố định
...
Ngày 15: PN (KHÔNG ĐỔI) ← Giữ nguyên số PN
...

✅ Workdays: 27 ngày (KHÔNG ĐỔI)
✅ Số ngày LP: 2 ngày (KHÔNG ĐỔI)
✅ Số ngày PN: 1 ngày (KHÔNG ĐỔI)
✅ Số ngày Ô: 1 ngày (KHÔNG ĐỔI)
✅ Consecutive: ≤ 6 ngày (KHÔNG VI PHẠM)
```

---

## 🛡️ Các Ràng Buộc Quan Trọng

### **1. CHỈ swap với LP (dayType=1)**

```typescript
// Kiểm tra ngày hiện tại phải là LP
const currentDayType = empDays.get(empId)?.get(day);
if (currentDayType !== 1) continue; // Không phải LP → bỏ qua

// Kiểm tra ngày swap đến phải là LP
const otherDayType = empDays.get(empId)?.get(otherDay);
if (otherDayType !== 1) continue; // Không phải LP → bỏ qua
```

**Lý do:** 
- PN (dayType=2) là phép năm, có số lượng cố định theo quy định
- Tất cả dayType ≥ 3 (Ô, TS, DS, O, NL, OF, P, ...) là dữ liệu đầu vào cố định từ người dùng
- CHỈ được thay đổi X (0), LP (1), PN (2) - là dữ liệu tự sinh ra từ giải thuật
- Nếu swap với PN hoặc dữ liệu cố định → VI PHẠM dữ liệu gốc

### **2. Đếm TẤT CẢ người nghỉ khi tính cân bằng**

```typescript
for (const member of members) {
  const dayType = empDays.get(member.empId)?.get(day);
  if (dayType === 0) {
    workingEmps.push(member.empId); // Người làm
  } else {
    // Đếm TẤT CẢ người nghỉ: LP(1), PN(2), Ô/TS/DS/O/NL/OF/P(3-9)
    restingEmps.push(member.empId);
  }
}
```

**Lý do:**
- Khi tính cân bằng, cần đếm TẤT CẢ người nghỉ (kể cả nghỉ đặc biệt)
- Nhưng khi swap, CHỈ được swap LP (không được động đến PN và các loại đặc biệt)

### **3. Kiểm tra consecutive (≤ 6 ngày)**

```typescript
const canSwapToWork = (empId: string, day: number): boolean => {
  // Đếm run X trước ngày này
  let runBefore = 0;
  for (let d = day - 1; d >= 1; d--) {
    if (dayMap.get(d) === 0) runBefore++;
    else break;
  }
  
  // Đếm run X sau ngày này
  let runAfter = 0;
  for (let d = day + 1; d <= daysInMonth; d++) {
    if (dayMap.get(d) === 0) runAfter++;
    else break;
  }
  
  // Nếu đổi LP→X, run = runBefore + 1 + runAfter
  return (runBefore + 1 + runAfter) <= maxConsec; // ≤ 6
};
```

**Ví dụ:**
```
Ngày 1: X
Ngày 2: X
Ngày 3: LP ← Muốn đổi thành X
Ngày 4: X
Ngày 5: X
Ngày 6: X

runBefore = 2 (ngày 1, 2)
runAfter = 3 (ngày 4, 5, 6)
→ Nếu đổi LP→X: run = 2 + 1 + 3 = 6 ✅ OK

Nhưng nếu:
Ngày 1: X
Ngày 2: X
Ngày 3: X
Ngày 4: LP ← Muốn đổi thành X
Ngày 5: X
Ngày 6: X
Ngày 7: X

runBefore = 3
runAfter = 3
→ Nếu đổi LP→X: run = 3 + 1 + 3 = 7 ❌ VI PHẠM
→ KHÔNG cho phép swap
```

### **4. Không tạo vi phạm mới ở ngày được swap đến**

```typescript
// Kiểm tra: Ngày kia có đang thiếu người nghỉ không?
let otherWorkCount = 0, otherRestCount = 0;
for (const m of members) {
  const dt = empDays.get(m.empId)?.get(otherDay);
  if (dt === 0) otherWorkCount++;
  else if (dt !== undefined) otherRestCount++;
}

// Tính chênh lệch sau khi swap
const newOtherDiff = Math.abs((otherWorkCount - 1) - (otherRestCount + 1));
if (newOtherDiff > otherMaxDiff) continue; // Tạo vi phạm mới → bỏ qua
```

**Ví dụ:**
```
Ngày 3: 2 làm, 8 nghỉ → Chênh 6 → VI PHẠM
Ngày 6: 5 làm, 5 nghỉ → Chênh 0 → OK

→ Muốn swap NV001: Ngày 3 (LP→X), Ngày 6 (X→LP)

Sau swap:
Ngày 3: 3 làm, 7 nghỉ → Chênh 4 → Tốt hơn ✅
Ngày 6: 4 làm, 6 nghỉ → Chênh 2 → Vẫn OK ✅

→ Cho phép swap
```

---

## 📊 So Sánh Các Loại Swap

| Loại Swap | Thay đổi workdays? | Thay đổi số PN? | Thay đổi dữ liệu cố định? | Vi phạm consecutive? | Kết luận |
|-----------|-------------------|-----------------|---------------------------|---------------------|----------|
| **SWAP giữa các NV** | ✅ CÓ | ✅ CÓ | ✅ CÓ | ⚠️ Có thể | ❌ SAI |
| **SWAP X ↔ LP giữa các ngày** | ❌ KHÔNG | ❌ KHÔNG | ❌ KHÔNG | ⚠️ Kiểm tra trước | ✅ ĐÚNG |
| **SWAP X ↔ PN giữa các ngày** | ❌ KHÔNG | ✅ CÓ | ❌ KHÔNG | ⚠️ Kiểm tra trước | ❌ SAI |
| **SWAP X ↔ (dayType ≥3) giữa các ngày** | ❌ KHÔNG | ❌ KHÔNG | ✅ CÓ | ⚠️ Kiểm tra trước | ❌ SAI |

**Chú thích:** dayType ≥3 là tất cả các loại nghỉ đặc biệt (Ô, TS, DS, O, NL, OF, P, ...)

---

## 🎯 Kết Luận

### **Ưu điểm:**
- ✅ KHÔNG thay đổi workdays (tổng số ngày làm)
- ✅ KHÔNG thay đổi số ngày phép năm (phepNam)
- ✅ KHÔNG thay đổi dữ liệu cố định (Ô, TS, DS, O, NL, OF, P)
- ✅ KHÔNG vi phạm consecutive (≤6 ngày)
- ✅ KHÔNG tạo vi phạm cân bằng mới ở ngày khác
- ✅ An toàn và tự động

### **Hạn chế:**
- ⚠️ Có thể không tìm được ngày để swap (nếu tất cả đều vi phạm consecutive)
- ⚠️ Chỉ sửa được một số vi phạm, không phải tất cả
- ⚠️ Cần có đủ ngày LP để swap (nếu NV chỉ có PN hoặc nghỉ đặc biệt thì không swap được)

### **Khuyến nghị:**
1. Chạy API `fix-lp-balance` để tự động sửa vi phạm
2. Nếu vẫn còn vi phạm → Sửa thủ công hoặc điều chỉnh giải thuật Bước 2
3. Cải thiện giải thuật phân bổ (Bước 2) để cân bằng tốt hơn từ đầu

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 2.0  
**Cập nhật:** Thêm thông tin về dayType mapping và các loại nghỉ đặc biệt (3-9)
