# ⚠️ Các Ràng Buộc Khi SWAP X ↔ LP

## 🎯 Mục Tiêu
Cân bằng số người nghỉ/làm theo từng ngày trong phòng ban bằng cách SWAP X ↔ LP giữa các NGÀY của cùng NV.

---

## 🚫 CÁC RÀNG BUỘC TUYỆT ĐỐI

### **NGUYÊN TẮC QUAN TRỌNG NHẤT:**
```
✅ CHỈ được thay đổi: X (0), LP (1), PN (2) - dữ liệu tự sinh
❌ TUYỆT ĐỐI KHÔNG thay đổi: dayType ≥ 3 - dữ liệu đầu vào cố định
```

### **1. KHÔNG thay đổi workdays**
- Tổng số ngày làm (X) của mỗi NV phải giữ nguyên
- Swap X ↔ LP giữa các ngày → workdays không đổi ✅

### **2. KHÔNG thay đổi số ngày phép năm (PN)**
- CHỈ swap với LP (dayType=1)
- KHÔNG swap với PN (dayType=2)
- Lý do: PN có số lượng cố định theo quy định

### **3. KHÔNG thay đổi dữ liệu cố định (dayType ≥ 3)**
- Tất cả các loại nghỉ đặc biệt là dữ liệu đầu vào cố định từ người dùng
- TUYỆT ĐỐI KHÔNG được thay đổi khi swap
- Bao gồm: Ô, TS, DS, O, NL, OF, P, và tất cả các loại khác

### **4. KHÔNG vi phạm consecutive (≤ 6 ngày)**
- Kiểm tra trước khi swap: `canSwapToWork()`
- Nếu swap tạo run > 6 ngày → KHÔNG cho phép

### **5. KHÔNG tạo vi phạm mới ở ngày được swap đến**
- Kiểm tra cân bằng ở ngày đích trước khi swap
- Nếu tạo vi phạm mới → KHÔNG cho phép

---

## ✅ LOGIC SWAP ĐÚNG

```typescript
// CHỈ swap nếu:
1. currentDayType === 1 (LP)
2. otherDayType === 1 (LP) hoặc 0 (X)
3. canSwapToWork() === true (không vi phạm consecutive)
4. Không tạo vi phạm mới ở ngày đích

// KHÔNG swap nếu:
- currentDayType === 2 (PN)
- currentDayType >= 3 (Tất cả dữ liệu cố định: Ô, TS, DS, O, NL, OF, P, ...)
- otherDayType === 2 (PN)
- otherDayType >= 3 (Tất cả dữ liệu cố định)
```

---

## 📊 Ví Dụ

### **✅ ĐÚNG: Swap X ↔ LP**
```
Trước swap:
Ngày 3: LP (nghỉ) ← Phòng thiếu người làm
Ngày 6: X (làm)

Sau swap:
Ngày 3: X (làm) ← Giúp cân bằng
Ngày 6: LP (nghỉ)

→ Workdays không đổi ✅
→ Số PN không đổi ✅
→ Dữ liệu cố định không đổi ✅
```

### **❌ SAI: Swap X ↔ PN**
```
Trước swap:
Ngày 3: PN (phép năm)
Ngày 6: X (làm)

Sau swap:
Ngày 3: X (làm)
Ngày 6: PN (phép năm)

→ Số ngày PN vẫn giữ nguyên
→ NHƯNG vị trí PN thay đổi ❌
→ KHÔNG cho phép vì PN có quy tắc vị trí riêng
```

### **❌ SAI: Swap X ↔ Ô (ốm)**
```
Trước swap:
Ngày 3: Ô (ốm) ← Dữ liệu cố định
Ngày 6: X (làm)

Sau swap:
Ngày 3: X (làm)
Ngày 6: Ô (ốm)

→ Thay đổi dữ liệu cố định ❌
→ TUYỆT ĐỐI KHÔNG cho phép
```

---

## 🔍 Kiểm Tra Trong Code

```typescript
// 1. Kiểm tra ngày hiện tại phải là LP
const currentDayType = empDays.get(empId)?.get(day);
if (currentDayType !== 1) continue; // ❌ Không phải LP → bỏ qua

// 2. Kiểm tra ngày swap đến
const otherDayType = empDays.get(empId)?.get(otherDay);
if (otherDayType !== 0 && otherDayType !== 1) continue; // ❌ Không phải X hoặc LP → bỏ qua

// 3. Kiểm tra consecutive
if (!canSwapToWork(empId, day)) continue; // ❌ Vi phạm consecutive → bỏ qua

// 4. Kiểm tra không tạo vi phạm mới
const newOtherDiff = Math.abs((otherWorkCount - 1) - (otherRestCount + 1));
if (newOtherDiff > otherMaxDiff) continue; // ❌ Tạo vi phạm mới → bỏ qua

// 5. Tất cả OK → Thực hiện swap
empDays.get(empId)!.set(day, 0);       // LP → X
empDays.get(empId)!.set(otherDay, 1);  // X → LP
```

---

## 📝 Tóm Tắt

| Ràng buộc | Mô tả | Kiểm tra |
|-----------|-------|----------|
| Workdays | Không thay đổi tổng số ngày làm | Swap X ↔ LP giữa các ngày |
| Số PN | Không thay đổi số ngày phép năm | CHỈ swap với LP (dayType=1) |
| Dữ liệu cố định | Không thay đổi Ô/TS/DS/O/NL/OF/P | KHÔNG swap với dayType 3-9 |
| Consecutive | Không vi phạm ≤ 6 ngày liên tiếp | `canSwapToWork()` |
| Vi phạm mới | Không tạo vi phạm ở ngày đích | Kiểm tra cân bằng trước swap |

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0
