# 💡 Đề Xuất Cải Tiến UI Kiểm Tra (Validate)

## 🎯 Vấn Đề Hiện Tại

Hiện tại có **7 checks về OT/Late** được hiển thị riêng lẻ:
1. Check 4: OT tối đa/ngày (≤ 4h)
2. Check 5: OT từ ngày 15
3. Check 6: Late tối đa/ngày (≤ 9 phút)
4. Check 7: Late từ ngày 15
5. Check QT7: OT tối thiểu/ngày (≥ 60 phút)
6. Check QT8: OT cân bằng trong phòng (chênh ≤ 30 phút)
7. Check QT9: OT giữa 2 ngày nghỉ (≤ 12h)

**Vấn đề:**
- ❌ Quá nhiều card riêng lẻ → Giao diện rối mắt
- ❌ Khó phân biệt check nào quan trọng
- ❌ Người dùng không biết nên xem check nào trước

---

## ✅ Đề Xuất: Nhóm Theo Mức Độ Quan Trọng

### **Phương án 1: Nhóm Theo Loại (Đơn giản nhất)**

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Tăng Ca (OT) - 5 điều kiện                           │
│ ├─ ✅ OT tối đa/ngày (≤ 4h) - 50 NV đạt                 │
│ ├─ ✅ OT từ ngày 15 - 50 NV đạt                         │
│ ├─ ⚠️ OT tối thiểu/ngày (≥ 60ph) - 2 vi phạm/2 NV      │
│ ├─ ⚠️ OT cân bằng phòng (≤ 30ph) - 3 vi phạm/3 phòng   │
│ └─ ✅ OT giữa 2 nghỉ (≤ 12h) - 50 NV đạt                │
│                                                          │
│ [🔧 Phân bổ lại OT] [📋 Xem chi tiết]                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ⏰ Đi Trễ (Late) - 2 điều kiện                          │
│ ├─ ✅ Late tối đa/ngày (≤ 9ph) - 50 NV đạt              │
│ └─ ✅ Late từ ngày 15 - 50 NV đạt                       │
│                                                          │
│ [🔧 Phân bổ lại Late] [📋 Xem chi tiết]                 │
└─────────────────────────────────────────────────────────┘
```

**Ưu điểm:**
- ✅ Gọn gàng, dễ nhìn
- ✅ Nhóm logic rõ ràng (OT vs Late)
- ✅ Giảm số card từ 7 → 2

**Nhược điểm:**
- ⚠️ Vẫn hiển thị tất cả checks (kể cả không quan trọng)

---

### **Phương án 2: Chỉ Hiển Thị Checks Quan Trọng (Khuyến nghị)**

**Ẩn các checks cơ bản (luôn đạt nếu logic đúng):**
- ❌ Check 4: OT tối đa/ngày (logic đã đảm bảo)
- ❌ Check 5: OT từ ngày 15 (logic đã đảm bảo)
- ❌ Check 6: Late tối đa/ngày (logic đã đảm bảo)
- ❌ Check 7: Late từ ngày 15 (logic đã đảm bảo)

**Chỉ hiển thị checks quan trọng (có thể vi phạm):**
- ✅ Check QT7: OT tối thiểu/ngày (có thể vi phạm do cân bằng)
- ✅ Check QT8: OT cân bằng trong phòng (quan trọng nhất)
- ✅ Check QT9: OT giữa 2 ngày nghỉ (quan trọng)

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Kiểm Tra Tăng Ca (OT)                                │
│                                                          │
│ ⚠️ OT tối thiểu/ngày (≥ 60 phút)                        │
│    2 vi phạm / 2 NV                                     │
│    [🔧 Phân bổ lại] [📋 Chi tiết]                       │
│                                                          │
│ ⚠️ OT cân bằng trong phòng (chênh ≤ 30 phút)            │
│    3 vi phạm / 3 phòng                                  │
│    [⚖️ Cân bằng OT] [📋 Chi tiết]                       │
│                                                          │
│ ✅ OT giữa 2 ngày nghỉ (≤ 12h)                          │
│    50 NV đạt                                            │
│                                                          │
│ [⚙️ Xem tất cả checks (7)]                              │
└─────────────────────────────────────────────────────────┘
```

**Ưu điểm:**
- ✅ Tập trung vào checks quan trọng
- ✅ Giảm nhiễu thông tin
- ✅ Người dùng biết ngay cần xem gì
- ✅ Vẫn có thể xem tất cả nếu cần

**Nhược điểm:**
- ⚠️ Cần thêm nút "Xem tất cả" cho power user

---

### **Phương án 3: Hiển Thị Theo Mức Độ (Nâng cao)**

**Chia thành 3 mức:**

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 Quan Trọng (Critical) - 1 vi phạm                    │
│                                                          │
│ ❌ OT giữa 2 ngày nghỉ (≤ 12h)                          │
│    1 vi phạm / 1 NV - NV001: 13.5h (ngày 2-5)          │
│    [🔧 Phân bổ lại] [📋 Chi tiết]                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🟡 Cảnh Báo (Warning) - 2 vi phạm                       │
│                                                          │
│ ⚠️ OT cân bằng trong phòng (chênh ≤ 30 phút)            │
│    2 vi phạm / 2 phòng                                  │
│    [⚖️ Cân bằng OT] [📋 Chi tiết]                       │
│                                                          │
│ ⚠️ OT tối thiểu/ngày (≥ 60 phút)                        │
│    1 vi phạm / 1 NV                                     │
│    [🔧 Phân bổ lại] [📋 Chi tiết]                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🟢 Đạt Yêu Cầu (OK) - 4 checks                          │
│ [▾ Xem chi tiết]                                        │
└─────────────────────────────────────────────────────────┘
```

**Ưu điểm:**
- ✅ Ưu tiên rõ ràng (Critical → Warning → OK)
- ✅ Người dùng biết ngay cần sửa gì trước
- ✅ Giao diện chuyên nghiệp

**Nhược điểm:**
- ⚠️ Phức tạp hơn để implement
- ⚠️ Cần định nghĩa mức độ cho từng check

---

## 🎨 Đề Xuất Cụ Thể (Khuyến nghị)

### **Áp dụng Phương án 2 + Một số cải tiến:**

#### **1. Nhóm checks theo loại và ẩn checks cơ bản:**

```typescript
// Định nghĩa nhóm checks
const CHECK_GROUPS = {
  ot_critical: {
    title: '📊 Tăng Ca - Checks Quan Trọng',
    checks: ['ot_min_per_day', 'ot_balance', 'ot_between_rest'],
    fixButton: '🔧 Phân bổ lại OT',
    fixAction: 'fixOtLate',
  },
  ot_basic: {
    title: '📊 Tăng Ca - Checks Cơ Bản',
    checks: ['ot_max_per_day', 'ot_start_day'],
    collapsed: true, // Ẩn mặc định
  },
  late_basic: {
    title: '⏰ Đi Trễ',
    checks: ['late_max_per_day', 'late_start_day'],
    collapsed: true, // Ẩn mặc định
  },
};
```

#### **2. UI mới:**

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Tăng Ca - Checks Quan Trọng                          │
│                                                          │
│ ⚠️ OT tối thiểu/ngày (≥ 60 phút)                        │
│    Nếu có OT thì phải ≥ 60 phút/ngày                    │
│    2 vi phạm / 2 NV                                     │
│    [📋 Chi tiết] [🔍 Lọc NV]                            │
│                                                          │
│ ⚠️ OT cân bằng trong phòng (chênh ≤ 30 phút)            │
│    Chênh lệch OT giữa NV cùng phòng ≤ 30 phút/ngày      │
│    3 vi phạm / 3 phòng                                  │
│    [⚖️ Cân bằng OT] [📋 Chi tiết]                       │
│                                                          │
│ ✅ OT giữa 2 ngày nghỉ (≤ 12h)                          │
│    Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ 12h            │
│    50 NV đạt                                            │
│                                                          │
│ [🔧 Phân bổ lại OT] [▾ Xem checks cơ bản (2)]          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ⏰ Đi Trễ                                                │
│ ✅ Tất cả điều kiện đạt (2 checks)                      │
│ [▾ Xem chi tiết]                                        │
└─────────────────────────────────────────────────────────┘
```

#### **3. Khi click "Xem checks cơ bản":**

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Tăng Ca - Checks Cơ Bản                              │
│                                                          │
│ ✅ OT tối đa/ngày (≤ 4h)                                │
│    OT không quá 4h mỗi ngày                             │
│    50 NV đạt                                            │
│                                                          │
│ ✅ OT từ ngày 15                                        │
│    Tăng ca chỉ phân bổ từ ngày 15                       │
│    50 NV đạt                                            │
│                                                          │
│ [▴ Ẩn checks cơ bản]                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 So Sánh Các Phương Án

| Tiêu chí | Hiện tại | PA1: Nhóm | PA2: Ẩn cơ bản | PA3: Theo mức |
|----------|----------|-----------|----------------|---------------|
| **Số card hiển thị** | 7 | 2 | 1-2 | 3 |
| **Dễ nhìn** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Tập trung** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Đơn giản** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Chuyên nghiệp** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Độ phức tạp code** | Thấp | Thấp | Trung bình | Cao |

---

## 🎯 Khuyến Nghị Cuối Cùng

### **Áp dụng Phương án 2 với các điểm sau:**

#### **1. Ẩn checks cơ bản mặc định:**
- OT tối đa/ngày (logic đã đảm bảo)
- OT từ ngày 15 (logic đã đảm bảo)
- Late tối đa/ngày (logic đã đảm bảo)
- Late từ ngày 15 (logic đã đảm bảo)

#### **2. Hiển thị checks quan trọng:**
- ✅ OT tối thiểu/ngày (có thể vi phạm)
- ✅ OT cân bằng trong phòng (quan trọng nhất)
- ✅ OT giữa 2 ngày nghỉ (quan trọng)

#### **3. Thêm nút "Xem tất cả checks":**
- Cho phép power user xem đầy đủ
- Mặc định ẩn để giảm nhiễu

#### **4. Nhóm theo loại:**
- Nhóm OT (3 checks quan trọng)
- Nhóm Late (ẩn mặc định nếu tất cả đạt)

#### **5. Thêm description ngắn:**
- Giúp người dùng hiểu check đó kiểm tra gì
- Ví dụ: "Nếu có OT thì phải ≥ 60 phút/ngày"

---

## 💻 Code Mẫu

```typescript
// Định nghĩa checks quan trọng
const IMPORTANT_CHECKS = new Set([
  'ot_min_per_day',      // QT7
  'ot_balance',          // QT8
  'ot_between_rest',     // QT9
]);

// Định nghĩa checks cơ bản (có thể ẩn)
const BASIC_CHECKS = new Set([
  'ot_max_per_day',      // Check 4
  'ot_start_day',        // Check 5
  'late_max_per_day',    // Check 6
  'late_start_day',      // Check 7
]);

// Trong component
const [showBasicChecks, setShowBasicChecks] = useState(false);

// Filter checks
const importantChecks = result.results.filter(c => IMPORTANT_CHECKS.has(c.id));
const basicChecks = result.results.filter(c => BASIC_CHECKS.has(c.id));
const otherChecks = result.results.filter(c => !IMPORTANT_CHECKS.has(c.id) && !BASIC_CHECKS.has(c.id));

// Render
return (
  <>
    {/* Checks quan trọng - luôn hiển thị */}
    <div className={styles.checkGroup}>
      <h3>📊 Tăng Ca - Checks Quan Trọng</h3>
      {importantChecks.map(check => <CheckCard key={check.id} check={check} />)}
      
      {/* Nút xem checks cơ bản */}
      <button onClick={() => setShowBasicChecks(!showBasicChecks)}>
        {showBasicChecks ? '▴' : '▾'} Xem checks cơ bản ({basicChecks.length})
      </button>
    </div>
    
    {/* Checks cơ bản - ẩn mặc định */}
    {showBasicChecks && (
      <div className={styles.checkGroup}>
        <h3>📊 Tăng Ca - Checks Cơ Bản</h3>
        {basicChecks.map(check => <CheckCard key={check.id} check={check} />)}
      </div>
    )}
    
    {/* Các checks khác */}
    {otherChecks.map(check => <CheckCard key={check.id} check={check} />)}
  </>
);
```

---

## 🎨 Mockup UI Mới

```
╔═══════════════════════════════════════════════════════════╗
║ Bước 4: Tăng ca/Đi trễ                                   ║
║                                                           ║
║ [▶ Chạy bước 4] [🔍 Kiểm tra] [📥 Xuất Excel]            ║
╚═══════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────┐
│ 🔍 Kết Quả Kiểm Tra                                      │
│                                                           │
│ ⚠️ Có 2 điều kiện chưa thỏa mãn                          │
│ Đã kiểm tra: 50 nhân viên                                │
│ Tổng vi phạm: 5                                          │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ 📊 Tăng Ca - Checks Quan Trọng                           │
│                                                           │
│ ⚠️ OT tối thiểu/ngày (≥ 60 phút)                         │
│    Nếu có OT thì phải ≥ 60 phút/ngày                     │
│    2 vi phạm / 2 NV                                      │
│    [📋 Chi tiết] [🔍 Lọc NV]                             │
│                                                           │
│ ⚠️ OT cân bằng trong phòng (chênh ≤ 30 phút)             │
│    Chênh lệch OT giữa NV cùng phòng ≤ 30 phút/ngày       │
│    3 vi phạm / 3 phòng                                   │
│    [⚖️ Cân bằng OT] [📋 Chi tiết]                        │
│                                                           │
│ ✅ OT giữa 2 ngày nghỉ (≤ 12h)                           │
│    Tổng OT giữa 2 ngày nghỉ liên tiếp ≤ 12h             │
│    50 NV đạt                                             │
│                                                           │
│ [🔧 Phân bổ lại OT] [▾ Xem checks cơ bản (4)]           │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ ⏰ Đi Trễ                                                 │
│ ✅ Tất cả điều kiện đạt (2 checks)                       │
│ [▾ Xem chi tiết]                                         │
└───────────────────────────────────────────────────────────┘
```

---

## ✅ Kết Luận

**Khuyến nghị: Áp dụng Phương án 2**

**Lý do:**
1. ✅ Giảm nhiễu thông tin (7 cards → 1-2 cards)
2. ✅ Tập trung vào checks quan trọng
3. ✅ Vẫn cho phép xem tất cả nếu cần
4. ✅ Dễ implement (không cần thay đổi logic backend)
5. ✅ UX tốt hơn cho người dùng thông thường

**Các bước thực hiện:**
1. Định nghĩa `IMPORTANT_CHECKS` và `BASIC_CHECKS`
2. Thêm state `showBasicChecks`
3. Filter và render theo nhóm
4. Thêm nút "Xem checks cơ bản"
5. Thêm description ngắn cho mỗi check

**Thời gian ước tính:** 2-3 giờ

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 1.0
