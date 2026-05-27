# ✅ Thay Đổi: Chỉ Hiển Thị 3 Checks Quan Trọng

## 🎯 Mục Tiêu

Giảm nhiễu thông tin bằng cách chỉ hiển thị 3 checks quan trọng nhất về OT tại Bước 4.

---

## 📝 Thay Đổi

### **File:** `src/app/api/distribution/validate/route.ts`

### **Trước:**
```typescript
// Trả về TẤT CẢ checks (7 checks về OT/Late)
const filtered = filterIds ? results.filter(r => filterIds.has(r.id)) : results;
```

### **Sau:**
```typescript
// Chỉ hiển thị 3 checks quan trọng về OT (trừ khi có filter cụ thể)
const IMPORTANT_OT_CHECKS = new Set(['ot_min_per_day', 'ot_balance', 'ot_between_rest']);
const filtered = filterIds 
  ? results.filter(r => filterIds.has(r.id)) 
  : results.filter(r => IMPORTANT_OT_CHECKS.has(r.id));
```

---

## 📊 Kết Quả

### **Trước (7 checks):**
```json
{
  "results": [
    { "id": "ot_max_per_day", "label": "OT tối đa/ngày (≤ 4h)", ... },
    { "id": "ot_start_day", "label": "OT từ ngày 15", ... },
    { "id": "late_max_per_day", "label": "Late tối đa/ngày (≤ 9ph)", ... },
    { "id": "late_start_day", "label": "Late từ ngày 15", ... },
    { "id": "ot_min_per_day", "label": "OT tối thiểu/ngày (≥ 60ph)", ... },
    { "id": "ot_balance", "label": "OT cân bằng trong phòng (≤ 30ph)", ... },
    { "id": "ot_between_rest", "label": "OT giữa 2 ngày nghỉ (≤ 12h)", ... }
  ]
}
```

### **Sau (3 checks):**
```json
{
  "results": [
    { "id": "ot_min_per_day", "label": "OT tối thiểu/ngày (≥ 60ph)", ... },
    { "id": "ot_balance", "label": "OT cân bằng trong phòng (≤ 30ph)", ... },
    { "id": "ot_between_rest", "label": "OT giữa 2 ngày nghỉ (≤ 12h)", ... }
  ]
}
```

---

## 🎨 UI Trước và Sau

### **Trước:**
```
┌─────────────────────────────────────────────────────────┐
│ ✅ OT tối đa/ngày (≤ 4h) - 50 NV đạt                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ✅ OT từ ngày 15 - 50 NV đạt                            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ✅ Late tối đa/ngày (≤ 9ph) - 50 NV đạt                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ✅ Late từ ngày 15 - 50 NV đạt                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ⚠️ OT tối thiểu/ngày (≥ 60ph) - 2 vi phạm/2 NV         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ⚠️ OT cân bằng trong phòng (≤ 30ph) - 3 vi phạm        │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ✅ OT giữa 2 ngày nghỉ (≤ 12h) - 50 NV đạt              │
└─────────────────────────────────────────────────────────┘
```

### **Sau:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ OT tối thiểu/ngày (≥ 60 phút)                        │
│    Nếu có OT thì phải ≥ 60 phút/ngày                    │
│    2 vi phạm / 2 NV                                     │
│    [📋 Chi tiết] [🔍 Lọc NV]                            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ⚠️ OT cân bằng trong phòng (chênh ≤ 30 phút)            │
│    Chênh lệch OT giữa NV cùng phòng ≤ 30 phút/ngày      │
│    3 vi phạm / 3 phòng                                  │
│    [⚖️ Cân bằng OT] [📋 Chi tiết]                       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ✅ OT giữa 2 ngày nghỉ (≤ 12h)                          │
│    Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ 12h            │
│    50 NV đạt                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 3 Checks Được Hiển Thị

### **1. OT tối thiểu/ngày (ot_min_per_day)**
- **ID:** `ot_min_per_day`
- **Label:** "Tăng ca tối thiểu/ngày (≥ 60 phút)"
- **Description:** "Nếu có OT thì phải ≥ 60 phút/ngày"
- **Lý do hiển thị:** Có thể vi phạm do cân bằng OT

### **2. OT cân bằng trong phòng (ot_balance)**
- **ID:** `ot_balance`
- **Label:** "OT cân bằng trong phòng (chênh ≤ 30 phút)"
- **Description:** "Chênh lệch OT giữa NV cùng phòng ≤ 30 phút/ngày"
- **Lý do hiển thị:** **QUAN TRỌNG NHẤT** - Đảm bảo công bằng

### **3. OT giữa 2 ngày nghỉ (ot_between_rest)**
- **ID:** `ot_between_rest`
- **Label:** "OT tối đa giữa 2 ngày nghỉ (≤ 12h)"
- **Description:** "Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ 12h"
- **Lý do hiển thị:** Quan trọng cho sức khỏe NV

---

## 🚫 Checks Bị Ẩn (Vẫn chạy ở backend)

### **4. OT tối đa/ngày (ot_max_per_day)**
- Logic đã đảm bảo, hiếm khi vi phạm

### **5. OT từ ngày 15 (ot_start_day)**
- Logic đã đảm bảo, hiếm khi vi phạm

### **6. Late tối đa/ngày (late_max_per_day)**
- Logic đã đảm bảo, hiếm khi vi phạm

### **7. Late từ ngày 15 (late_start_day)**
- Logic đã đảm bảo, hiếm khi vi phạm

**Lưu ý:** Các checks này vẫn được chạy ở backend, chỉ không hiển thị ở frontend.

---

## 🔧 Cách Sử Dụng Filter (Nếu Cần)

Nếu muốn xem tất cả checks hoặc checks cụ thể, có thể dùng query parameter `ids`:

```bash
# Xem tất cả checks
GET /api/distribution/validate?month=month_jan2026&ids=ot_max_per_day,ot_start_day,late_max_per_day,late_start_day,ot_min_per_day,ot_balance,ot_between_rest

# Xem chỉ 1 check cụ thể
GET /api/distribution/validate?month=month_jan2026&ids=ot_balance
```

---

## ✅ Lợi Ích

### **1. Giảm nhiễu thông tin:**
- Từ 7 cards → 3 cards
- Giao diện gọn gàng hơn

### **2. Tập trung vào điều quan trọng:**
- Chỉ hiển thị checks có thể vi phạm
- Người dùng biết ngay cần xem gì

### **3. Không mất thông tin:**
- Các checks khác vẫn chạy ở backend
- Có thể xem qua API nếu cần

### **4. Tương thích ngược:**
- Không ảnh hưởng đến code frontend hiện tại
- Frontend chỉ nhận ít checks hơn

---

## 🧪 Test

### **Test 1: Gọi API không có filter**
```bash
GET /api/distribution/validate?month=month_jan2026
```

**Kết quả mong đợi:**
```json
{
  "results": [
    { "id": "ot_min_per_day", ... },
    { "id": "ot_balance", ... },
    { "id": "ot_between_rest", ... }
  ]
}
```

### **Test 2: Gọi API có filter**
```bash
GET /api/distribution/validate?month=month_jan2026&ids=ot_max_per_day,ot_start_day
```

**Kết quả mong đợi:**
```json
{
  "results": [
    { "id": "ot_max_per_day", ... },
    { "id": "ot_start_day", ... }
  ]
}
```

---

## 📊 So Sánh

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| **Số checks hiển thị** | 7 | 3 |
| **Số cards UI** | 7 | 3 |
| **Checks chạy backend** | 7 | 7 (không đổi) |
| **Thời gian load** | Nhanh | Nhanh hơn (ít data) |
| **Dễ đọc** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Tập trung** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Kết Luận

✅ **Đã thay đổi thành công**

**Thay đổi:**
- Chỉ hiển thị 3 checks quan trọng nhất
- Giữ nguyên thiết kế UI hiện tại
- Không cần thay đổi frontend

**Lợi ích:**
- Giao diện gọn gàng hơn (7 → 3 cards)
- Tập trung vào checks quan trọng
- Giảm nhiễu thông tin

**File đã sửa:**
- `src/app/api/distribution/validate/route.ts` (1 dòng thay đổi)

---

**Ngày thay đổi:** 2026-05-27  
**Phiên bản:** 1.0
