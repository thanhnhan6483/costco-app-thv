# KIỂM TRA LOGIC "NGÀY KẾT THÚC" NHÓM ĐẶC THÙ

## 📋 YÊU CẦU

### Trường hợp 1: Có "NGÀY KẾT THÚC"
**Ví dụ**: `NHÓM ĐẶC THÙ = '18_DUOI_18'`, `NGÀY KẾT THÚC = '15/04/2025'`

**Kỳ vọng**:
- Ngày 1-15/4/2025: Áp dụng nhóm đặc thù (7 giờ/ngày)
- Ngày 16-30/4/2025: Áp dụng bình thường (8 giờ/ngày)

### Trường hợp 2: Không có "NGÀY KẾT THÚC" (trống)
**Ví dụ**: `NHÓM ĐẶC THÙ = '18_DUOI_18'`, `NGÀY KẾT THÚC = ''`

**Kỳ vọng**:
- Cả tháng: Áp dụng nhóm đặc thù (7 giờ/ngày)

---

## 🔍 PHÂN TÍCH CODE HIỆN TẠI

### Code trong `step/5/route.ts` (line 46-58)

```typescript
// Parse groupCodeEndDate → ngày kết thúc (day trong tháng), null = không giới hạn
let endDay: number | null = null;
if (emp.groupCodeEndDate) {
  const parts = emp.groupCodeEndDate.split(/[\/\-]/);
  if (parts.length >= 3) {
    // dd/mm/yyyy hoặc yyyy-mm-dd
    const d = parseInt(parts[0]), m = parseInt(parts[1]), y = parseInt(parts[2]);
    const [dy, dm, dd] = parts[0].length === 4 ? [d, m, parseInt(parts[2])] : [y, m, d];
    if (dm === month && dy === year) endDay = dd;
    else if (dy < year || (dy === year && dm < month)) endDay = 0; // đã hết hạn toàn tháng
    // dy > year hoặc dm > month → còn hiệu lực toàn tháng → endDay = null
  }
}

for (const d of days) {
  // Kiểm tra nhóm đặc thù còn hiệu lực tại ngày d.day không
  const groupWorkHours = (endDay === null || d.day <= endDay) ? baseGroupWorkHours : null;
  // ...
}
```

---

## ✅ KIỂM TRA TỪNG TRƯỜNG HỢP

### Test Case 1: Tháng 4/2025, NGÀY KẾT THÚC = '15/04/2025'

**Input**:
- `emp.groupCodeEndDate = '15/04/2025'`
- `month = 4`, `year = 2025`
- `baseGroupWorkHours = 7`

**Xử lý**:
```typescript
parts = ['15', '04', '2025']
d = 15, m = 4, y = 2025
parts[0].length = 2 (không phải 4)
→ [dy, dm, dd] = [y, m, d] = [2025, 4, 15]

dm === month && dy === year
→ 4 === 4 && 2025 === 2025 ✓
→ endDay = 15
```

**Áp dụng**:
```typescript
// Ngày 1-15
d.day = 1-15
endDay = 15
d.day <= endDay → TRUE
→ groupWorkHours = 7 ✓

// Ngày 16-30
d.day = 16-30
endDay = 15
d.day <= endDay → FALSE
→ groupWorkHours = null ✓ (áp dụng 8 giờ)
```

**Kết quả**: ✅ **ĐÚNG**

---

### Test Case 2: Tháng 4/2025, NGÀY KẾT THÚC = '' (trống)

**Input**:
- `emp.groupCodeEndDate = ''`
- `month = 4`, `year = 2025`
- `baseGroupWorkHours = 7`

**Xử lý**:
```typescript
if (emp.groupCodeEndDate) → FALSE (chuỗi rỗng)
→ endDay = null (giữ nguyên giá trị khởi tạo)
```

**Áp dụng**:
```typescript
// Tất cả các ngày
endDay = null
endDay === null → TRUE
→ groupWorkHours = 7 ✓
```

**Kết quả**: ✅ **ĐÚNG**

---

### Test Case 3: Tháng 5/2025, NGÀY KẾT THÚC = '15/04/2025' (đã hết hạn)

**Input**:
- `emp.groupCodeEndDate = '15/04/2025'`
- `month = 5`, `year = 2025`
- `baseGroupWorkHours = 7`

**Xử lý**:
```typescript
parts = ['15', '04', '2025']
[dy, dm, dd] = [2025, 4, 15]

dm === month && dy === year
→ 4 === 5 && 2025 === 2025 → FALSE

else if (dy < year || (dy === year && dm < month))
→ 2025 < 2025 → FALSE
→ 2025 === 2025 && 4 < 5 → TRUE ✓
→ endDay = 0
```

**Áp dụng**:
```typescript
// Tất cả các ngày
endDay = 0
d.day = 1-31
d.day <= endDay → 1 <= 0 → FALSE
→ groupWorkHours = null ✓ (không áp dụng nhóm đặc thù)
```

**Kết quả**: ✅ **ĐÚNG**

---

### Test Case 4: Tháng 3/2025, NGÀY KẾT THÚC = '15/04/2025' (chưa đến)

**Input**:
- `emp.groupCodeEndDate = '15/04/2025'`
- `month = 3`, `year = 2025`
- `baseGroupWorkHours = 7`

**Xử lý**:
```typescript
parts = ['15', '04', '2025']
[dy, dm, dd] = [2025, 4, 15]

dm === month && dy === year
→ 4 === 3 && 2025 === 2025 → FALSE

else if (dy < year || (dy === year && dm < month))
→ 2025 < 2025 → FALSE
→ 2025 === 2025 && 4 < 3 → FALSE

// Không vào bất kỳ nhánh nào
→ endDay = null (giữ nguyên)
```

**Áp dụng**:
```typescript
// Tất cả các ngày
endDay = null
endDay === null → TRUE
→ groupWorkHours = 7 ✓ (áp dụng cả tháng)
```

**Kết quả**: ✅ **ĐÚNG** (Tháng trước ngày kết thúc → áp dụng toàn tháng)

---

### Test Case 5: Format yyyy-mm-dd (VD: '2025-04-15')

**Input**:
- `emp.groupCodeEndDate = '2025-04-15'`
- `month = 4`, `year = 2025`

**Xử lý**:
```typescript
parts = ['2025', '04', '15']
d = 2025, m = 4, y = 15
parts[0].length = 4 ✓
→ [dy, dm, dd] = [d, m, parseInt(parts[2])] = [2025, 4, 15]

dm === month && dy === year
→ 4 === 4 && 2025 === 2025 ✓
→ endDay = 15
```

**Kết quả**: ✅ **ĐÚNG** (Hỗ trợ cả 2 format)

---

## 📊 BẢNG TỔNG HỢP

| Tháng | NGÀY KẾT THÚC | endDay | Ngày 1-15 | Ngày 16-30 | Kết quả |
|-------|---------------|--------|-----------|------------|---------|
| 4/2025 | '15/04/2025' | 15 | 7 giờ ✓ | 8 giờ ✓ | ✅ ĐÚNG |
| 4/2025 | '' (trống) | null | 7 giờ ✓ | 7 giờ ✓ | ✅ ĐÚNG |
| 5/2025 | '15/04/2025' | 0 | 8 giờ ✓ | 8 giờ ✓ | ✅ ĐÚNG |
| 3/2025 | '15/04/2025' | null | 7 giờ ✓ | 7 giờ ✓ | ✅ ĐÚNG |

---

## ✅ KẾT LUẬN

### Logic hiện tại **HOÀN TOÀN ĐÚNG** ✓

**Các trường hợp được xử lý chính xác**:

1. ✅ **Có NGÀY KẾT THÚC trong tháng hiện tại**:
   - Ngày ≤ NGÀY KẾT THÚC: Áp dụng nhóm đặc thù
   - Ngày > NGÀY KẾT THÚC: Áp dụng bình thường

2. ✅ **NGÀY KẾT THÚC trống**:
   - Cả tháng: Áp dụng nhóm đặc thù

3. ✅ **NGÀY KẾT THÚC đã qua (tháng trước)**:
   - Cả tháng: Không áp dụng nhóm đặc thù

4. ✅ **NGÀY KẾT THÚC chưa đến (tháng sau)**:
   - Cả tháng: Áp dụng nhóm đặc thù

5. ✅ **Hỗ trợ 2 format**:
   - `dd/mm/yyyy` (VD: '15/04/2025')
   - `yyyy-mm-dd` (VD: '2025-04-15')

---

## 🎯 VÍ DỤ THỰC TẾ

### Nhân viên mang thai đến 15/4/2025

**Dữ liệu**:
```
Mã NV: NV001
Tên: Nguyễn Thị A
NHÓM ĐẶC THÙ: 19A_CO_THAI
NGÀY KẾT THÚC: 15/04/2025
```

**Tháng 4/2025**:
- Ngày 1-15: Làm 7 giờ/ngày (mang thai)
- Ngày 16-30: Làm 8 giờ/ngày (bình thường)

**Tháng 5/2025**:
- Cả tháng: Làm 8 giờ/ngày (đã hết thời gian mang thai)

**Code thực thi**:
```typescript
// Tháng 4/2025
endDay = 15

// Ngày 10/4
d.day = 10
10 <= 15 → TRUE
→ groupWorkHours = 7
→ checkOut = '15:30' (giảm 1 giờ)

// Ngày 20/4
d.day = 20
20 <= 15 → FALSE
→ groupWorkHours = null
→ checkOut = '16:32' (bình thường)
```

---

## 📝 KHÔNG CẦN SỬA GÌ

Logic code **HOÀN HẢO**, xử lý đúng tất cả các trường hợp theo yêu cầu!
