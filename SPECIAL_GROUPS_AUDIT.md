# KIỂM TRA LOGIC NHÓM ĐẶC THÙ

## ✅ PHẦN ĐÚNG

### 1. Logic tra cứu trong Bước 5 (ĐÚNG)

**File**: `src/app/api/distribution/step/5/route.ts`

```typescript
// Line 17-18: Load special_groups và chuyển code thành UPPERCASE
const rawGroups = await conn.all<{ code: string; workHours: number }>(
  `SELECT code, work_hours AS workHours FROM special_groups WHERE month_id=?`, monthId
);
const specialGroupHours = new Map(rawGroups.map(g => [g.code.toUpperCase(), g.workHours]));

// Line 41-42: Tra cứu special_group của nhân viên (cũng chuyển UPPERCASE)
const groupCode = (emp.specialGroup ?? '').toUpperCase();
const baseGroupWorkHours = groupCode ? (specialGroupHours.get(groupCode) ?? null) : null;

// Line 60-61: Kiểm tra hiệu lực theo ngày
const groupWorkHours = (endDay === null || d.day <= endDay) ? baseGroupWorkHours : null;

// Line 62-65: Gọi step6_generateTime với groupWorkHours
const { checkIn, checkOut } = step6_generateTime(
  d.dayType, d.otHours, d.lateMins, d.shiftCode,
  entry.ca1, entry.ca2, groupWorkHours, params
);
```

**Kết luận**: Logic tra cứu **ĐÚNG** - cả 2 bên đều chuyển thành UPPERCASE nên sẽ khớp.

---

### 2. Logic áp dụng giảm giờ (ĐÚNG)

**File**: `src/lib/distributionEngine.ts`

```typescript
// Line 728-732: Áp dụng giảm giờ
if (groupWorkHours !== null) {
  const reduction = 8 - groupWorkHours;
  if (reduction > 0) checkOut = addMins(checkOut, -reduction * 60);
}
```

**Ví dụ**:
- `groupWorkHours = 7`
- `reduction = 8 - 7 = 1`
- `checkOut = '16:30' - 60 phút = '15:30'`

**Kết luận**: Logic tính toán **ĐÚNG**.

---

### 3. Lưu code vào database (ĐÚNG)

**File**: `src/app/api/special-groups/route.ts`

```typescript
// Line 28-31: Lưu code.toUpperCase()
await conn.run(
  `INSERT INTO special_groups (id,month_id,code,name,work_hours,note,created_at) VALUES (?,?,?,?,?,?,?)`,
  id, mid, code.toUpperCase(), name, workHours ?? 8.0, note ?? '', createdAt
);
```

**Kết luận**: Lưu UPPERCASE vào database **ĐÚNG** - nhất quán với logic tra cứu.

---

## ⚠️ VẤN ĐỀ CẦN SỬA

### 1. Mismatch giữa Type và Database Schema

**Type Definition** (`src/types/index.ts`):
```typescript
export interface SpecialGroup {
  code: string;
  name: string;
  maxHoursPerDay: number;  // ❌ Tên field không khớp
  legalBasis: string;
}
```

**Database Schema** (`src/lib/db.ts`):
```sql
CREATE TABLE special_groups (
  id         VARCHAR PRIMARY KEY,
  month_id   VARCHAR NOT NULL,
  code       VARCHAR NOT NULL,
  name       VARCHAR NOT NULL,
  work_hours DOUBLE DEFAULT 8.0,  -- ✅ Tên field trong DB
  note       VARCHAR DEFAULT '',
  created_at VARCHAR NOT NULL
)
```

**Vấn đề**: 
- Type có field `maxHoursPerDay`
- Database có field `work_hours`
- Không đồng bộ!

**Giải pháp**: Cập nhật type để khớp với database:

```typescript
export interface SpecialGroup {
  code: string;
  name: string;
  workHours: number;  // Đổi từ maxHoursPerDay → workHours
  note?: string;      // Thêm field note
}
```

---

### 2. DEFAULT_SPECIAL_GROUPS sử dụng field cũ

**File**: `src/data/defaults.ts`

```typescript
export const DEFAULT_SPECIAL_GROUPS: SpecialGroup[] = [
  { code: '18_DUOI_18', name: 'Dưới 18 tuổi', maxHoursPerDay: 7, legalBasis: 'Bộ luật Lao động điều 146' },
  { code: '19A_CO_THAI', name: 'Mang thai', maxHoursPerDay: 7, legalBasis: 'Bộ luật Lao động điều 137' },
  { code: '19_NUOI_CON_NHO', name: 'Nuôi con nhỏ (< 12 tháng)', maxHoursPerDay: 7, legalBasis: 'Bộ luật Lao động điều 137' },
];
```

**Vấn đề**: Sử dụng `maxHoursPerDay` thay vì `workHours`

**Giải pháp**: Cập nhật để khớp với type mới:

```typescript
export const DEFAULT_SPECIAL_GROUPS: SpecialGroup[] = [
  { code: '18_DUOI_18', name: 'Dưới 18 tuổi', workHours: 7, note: 'Bộ luật Lao động điều 146' },
  { code: '19A_CO_THAI', name: 'Mang thai', workHours: 7, note: 'Bộ luật Lao động điều 137' },
  { code: '19_NUOI_CON_NHO', name: 'Nuôi con nhỏ (< 12 tháng)', workHours: 7, note: 'Bộ luật Lao động điều 137' },
];
```

---

## 📋 TÓM TẮT

### ✅ Đúng:
1. Logic tra cứu `work_hours` từ database
2. Logic áp dụng giảm giờ làm
3. Chuyển đổi UPPERCASE nhất quán
4. Kiểm tra hiệu lực theo `groupCodeEndDate`
5. Mã nhóm đã cập nhật đúng: `18_DUOI_18`, `19A_CO_THAI`, `19_NUOI_CON_NHO`

### ⚠️ Cần sửa:
1. Type `SpecialGroup`: Đổi `maxHoursPerDay` → `workHours`, thêm `note`
2. `DEFAULT_SPECIAL_GROUPS`: Đổi `maxHoursPerDay` → `workHours`, `legalBasis` → `note`

---

## 🔧 HÀNH ĐỘNG CẦN THỰC HIỆN

1. Cập nhật type `SpecialGroup` trong `src/types/index.ts`
2. Cập nhật `DEFAULT_SPECIAL_GROUPS` trong `src/data/defaults.ts`
3. Kiểm tra xem có nơi nào khác sử dụng `maxHoursPerDay` không

---

## ✅ KẾT LUẬN

**Giải thuật phân bổ giờ cho nhóm đặc thù hoạt động ĐÚNG**, chỉ cần đồng bộ type definition với database schema.
