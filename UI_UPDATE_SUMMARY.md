# ✅ Tóm Tắt Cập Nhật Giao Diện

## 🎯 Mục Tiêu

Cập nhật giao diện để hiển thị 3 checks OT quan trọng với thiết kế hiện tại, bổ sung description và nút sửa phù hợp.

---

## 📝 Các Thay Đổi

### **1. Backend (validate/route.ts)**

**Thay đổi:** Chỉ trả về 3 checks quan trọng

```typescript
// Chỉ hiển thị 3 checks quan trọng về OT (trừ khi có filter cụ thể)
const IMPORTANT_OT_CHECKS = new Set(['ot_min_per_day', 'ot_balance', 'ot_between_rest']);
const filtered = filterIds 
  ? results.filter(r => filterIds.has(r.id)) 
  : results.filter(r => IMPORTANT_OT_CHECKS.has(r.id));
```

---

### **2. Frontend (AutoAlloc.tsx)**

#### **Thay đổi 1: Thêm nút "Phân bổ lại" và "Cân bằng OT"**

```typescript
// Thêm ot_min_per_day và ot_between_rest vào danh sách có nút "Phân bổ lại"
{(['ot_max_per_day', 'ot_start_day', 'late_max_per_day', 'late_start_day', 
   'ot_min_per_day', 'ot_between_rest'] as string[]).includes(check.id) && 
   check.violationCount > 0 && (
  <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixOtLate(); }} 
    disabled={fixingOtLate || loading} type="button">
    {fixingOtLate ? '...' : '🔧 Phân bổ lại'}
  </button>
)}

// Thêm nút riêng cho ot_balance
{check.id === 'ot_balance' && check.violationCount > 0 && (
  <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixOtLate(); }} 
    disabled={fixingOtLate || loading} type="button">
    {fixingOtLate ? '...' : '⚖️ Cân bằng OT'}
  </button>
)}
```

#### **Thay đổi 2: Hiển thị description cho 3 checks OT**

```typescript
{/* Description cho 3 checks OT quan trọng */}
{(['ot_min_per_day', 'ot_balance', 'ot_between_rest'] as string[]).includes(check.id) && (
  <div style={{ padding: '4px 12px 6px 32px', fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
    {check.description}
  </div>
)}
```

#### **Thay đổi 3: Hiển thị violations cho OT checks**

```typescript
{/* Violations cho ot_min_per_day và ot_between_rest */}
{(['ot_min_per_day', 'ot_between_rest'] as string[]).includes(check.id) && 
  check.violations.length > 0 && expandedChecks.has(check.id) && (
  <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #e2e8f0', ... }}>
    {check.violations.map((v, i) => (
      <div key={i} style={{ ... }}>
        <span>{v.code}</span>
        <span>{v.name}</span>
        <span>{v.detail}</span>
      </div>
    ))}
  </div>
)}

{/* Violations cho ot_balance (có summary) */}
{check.id === 'ot_balance' && check.violations.length > 0 && expandedChecks.has(check.id) && (
  <div style={{ ... }}>
    {check.violations.map((v, i) => {
      const isSummary = v.code === '—' && v.name.startsWith('📊');
      return (
        <div key={i} style={{ 
          background: isSummary ? '#fef9c3' : 'transparent',
          borderLeft: isSummary ? '3px solid #eab308' : '2px solid #e2e8f0',
          ...
        }}>
          {isSummary ? <summary> : <detail>}
        </div>
      );
    })}
  </div>
)}
```

---

## 🎨 Giao Diện Sau Khi Cập Nhật

### **Check 1: OT tối thiểu/ngày**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Tăng ca tối thiểu/ngày (≥ 60 phút)                   │
│    2 vi phạm/2 NV  (Chi tiết)  [🔧 Phân bổ lại]        │
│                                                          │
│ Nếu có OT thì phải ≥ 60 phút/ngày                       │
│                                                          │
│ [Khi click "Chi tiết"]                                  │
│ ├─ NV001  Nguyễn Văn A  OT ngày 15: 30ph (dưới 60ph)   │
│ └─ NV002  Trần Thị B    OT ngày 18: 45ph (dưới 60ph)   │
└─────────────────────────────────────────────────────────┘
```

### **Check 2: OT cân bằng trong phòng**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ OT cân bằng trong phòng (chênh ≤ 30 phút)            │
│    3 vi phạm  (Chi tiết)  [⚖️ Cân bằng OT]              │
│                                                          │
│ Chênh lệch OT giữa NV cùng phòng ≤ 30 phút/ngày         │
│                                                          │
│ [Khi click "Chi tiết"]                                  │
│ ┌─ 📊 Sản Xuất  2 ngày vi phạm                          │
│ ├─ Ngày 15: OT chênh 180ph (max 30ph) — [240ph, ...]   │
│ └─ Ngày 20: OT chênh 120ph (max 30ph) — [180ph, ...]   │
└─────────────────────────────────────────────────────────┘
```

### **Check 3: OT giữa 2 ngày nghỉ**
```
┌─────────────────────────────────────────────────────────┐
│ ✅ OT tối đa giữa 2 ngày nghỉ (≤ 12h)                   │
│    ✓ 50 đạt                                             │
│                                                          │
│ Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ 12h               │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 So Sánh Trước và Sau

### **Trước:**
- 7 check cards riêng lẻ
- Không có description
- Nút "Phân bổ lại" chung cho tất cả OT checks
- Không có nút riêng cho cân bằng OT

### **Sau:**
- 3 check cards quan trọng
- Có description giải thích từng check
- Nút "Phân bổ lại" cho ot_min_per_day và ot_between_rest
- Nút "⚖️ Cân bằng OT" riêng cho ot_balance
- Hiển thị violations với format phù hợp

---

## ✅ Tính Năng Mới

### **1. Description tự động:**
- Hiển thị ngay dưới label
- Giúp người dùng hiểu check đó kiểm tra gì
- Font nhỏ, màu xám, không chiếm nhiều không gian

### **2. Nút sửa phù hợp:**
- **ot_min_per_day:** "🔧 Phân bổ lại" (gọi fixOtLate)
- **ot_balance:** "⚖️ Cân bằng OT" (gọi fixOtLate)
- **ot_between_rest:** "🔧 Phân bổ lại" (gọi fixOtLate)

### **3. Hiển thị violations:**
- **ot_min_per_day:** Danh sách NV vi phạm
- **ot_balance:** Summary theo phòng + chi tiết từng ngày
- **ot_between_rest:** Danh sách NV vi phạm với period

---

## 🧪 Test

### **Test 1: Kiểm tra API trả về đúng 3 checks**
```bash
GET /api/distribution/validate?month=month_jan2026
```
**Kết quả mong đợi:** Chỉ có 3 checks (ot_min_per_day, ot_balance, ot_between_rest)

### **Test 2: Kiểm tra hiển thị description**
- Mở trang Bước 4
- Click "🔍 Kiểm tra"
- Xem có hiển thị description dưới mỗi check không

### **Test 3: Kiểm tra nút sửa**
- Check có vi phạm → Có nút "🔧 Phân bổ lại" hoặc "⚖️ Cân bằng OT"
- Click nút → Gọi API fix
- Sau khi fix → Kiểm tra lại

### **Test 4: Kiểm tra hiển thị violations**
- Click "(Chi tiết)" → Hiển thị danh sách vi phạm
- ot_balance → Có summary theo phòng (màu vàng)
- ot_min_per_day → Danh sách NV với code, name, detail

---

## 📁 Files Đã Sửa

1. **src/app/api/distribution/validate/route.ts**
   - Thêm filter để chỉ trả về 3 checks quan trọng

2. **src/components/pages/AutoAlloc/AutoAlloc.tsx**
   - Thêm nút "Phân bổ lại" cho ot_min_per_day và ot_between_rest
   - Thêm nút "⚖️ Cân bằng OT" cho ot_balance
   - Thêm hiển thị description cho 3 checks OT
   - Thêm hiển thị violations cho 3 checks OT

---

## 🎯 Kết Luận

✅ **Đã hoàn thành cập nhật giao diện**

**Thay đổi:**
- Backend: Chỉ trả về 3 checks quan trọng
- Frontend: Thêm description, nút sửa phù hợp, hiển thị violations

**Lợi ích:**
- Giao diện gọn gàng hơn (7 → 3 cards)
- Thông tin rõ ràng hơn (có description)
- Dễ sử dụng hơn (nút sửa phù hợp)
- Giữ nguyên thiết kế hiện tại

**Tương thích:**
- Không ảnh hưởng đến các bước khác
- Không cần migration database
- Không cần thay đổi CSS

---

**Ngày cập nhật:** 2026-05-27  
**Phiên bản:** 1.0
