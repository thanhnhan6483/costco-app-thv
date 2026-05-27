# BƯỚC 5: SINH GIỜ VÀO/RA (CHECK_IN / CHECK_OUT)

## 📋 TỔNG QUAN

**Mục đích**: Sinh giờ vào (`check_in`) và giờ ra (`check_out`) cho mỗi ngày làm việc dựa trên:
- Ca làm việc (shift_code)
- Tăng ca (ot_hours)
- Đi trễ (late_mins)
- Nhóm đặc thù (special_group với giờ làm giảm)

**Input**: Dữ liệu từ Bước 4 (đã có dayType, shift_code, ot_hours, late_mins)

**Output**: Cập nhật `check_in` và `check_out` vào bảng `distribution_results`

---

## 🔧 GIẢI THUẬT CHÍNH

### Hàm: `step6_generateTime()`

**File**: `src/lib/distributionEngine.ts` (line 705-733)

**Tham số**:
```typescript
dayType: number          // Loại ngày (0=X, 1=LP, 2=PN, ≥3=cố định)
otHours: number          // Số giờ tăng ca
lateMins: number         // Số phút đi trễ
shiftCode: string        // Mã ca ('C1' hoặc 'C2')
shift1: ShiftInfo        // Thông tin Ca 1
shift2: ShiftInfo        // Thông tin Ca 2
groupWorkHours: number   // Giờ làm của nhóm đặc thù (null = bình thường)
params: AllocParams      // Tham số cấu hình
```

**ShiftInfo Structure**:
```typescript
{
  departmentId: string | null
  shiftType: string              // 'C1' hoặc 'C2'
  windowStart: string            // VD: '07:05' - Bắt đầu khung giờ vào
  clockIn: string                // VD: '07:30' - Giờ vào chuẩn
  clockOut: string               // VD: '16:30' - Giờ ra chuẩn
  windowEnd: string              // VD: '16:35' - Kết thúc khung giờ ra
}
```

---

## 📊 LOGIC SINH GIỜ

### 1️⃣ XỬ LÝ NGÀY NGHỈ

```typescript
if (dayType === 1) return { checkIn: '00:00', checkOut: '00:00' };  // LP
if (dayType === 2) return { checkIn: 'PN', checkOut: 'PN' };        // PN
if (dayType !== 0) return { checkIn: '', checkOut: '' };            // Dữ liệu cố định
```

**Quy tắc**:
- **LP (dayType=1)**: `00:00` → `00:00`
- **PN (dayType=2)**: `PN` → `PN`
- **Dữ liệu cố định (≥3)**: Trống

---

### 2️⃣ CHỌN CA LÀM VIỆC

```typescript
const shift = (shiftCode === 'C2' && shift2) ? shift2
  : (shiftCode === 'C1' && shift1) ? shift1
  : shift1 ?? shift2 ?? DEFAULT_SHIFT;
```

**Logic**:
1. Nếu `shiftCode = 'C2'` và có `shift2` → dùng Ca 2
2. Nếu `shiftCode = 'C1'` và có `shift1` → dùng Ca 1
3. Fallback: `shift1` → `shift2` → `DEFAULT_SHIFT`

**DEFAULT_SHIFT**:
```typescript
{
  windowStart: '07:05',
  clockIn: '07:30',
  clockOut: '16:30',
  windowEnd: '16:35'
}
```

---

### 3️⃣ SINH GIỜ VÀO/RA CƠ BẢN (NGẪU NHIÊN)

```typescript
let checkIn  = randomTime(shift.windowStart, shift.clockIn);
let checkOut = randomTime(shift.clockOut, shift.windowEnd);
```

**Hàm `randomTime(startHHMM, endHHMM)`**:
- Chọn ngẫu nhiên 1 thời điểm trong khoảng `[start, end]`
- VD: `randomTime('07:05', '07:30')` → có thể trả về `'07:12'`, `'07:23'`, ...

**Ví dụ**:
- Ca 1: `windowStart='07:05'`, `clockIn='07:30'`
  - `checkIn` = ngẫu nhiên trong `[07:05, 07:30]`
- Ca 1: `clockOut='16:30'`, `windowEnd='16:35'`
  - `checkOut` = ngẫu nhiên trong `[16:30, 16:35]`

---

### 4️⃣ ĐIỀU CHỈNH TĂNG CA (OT)

```typescript
if (otHours > 0) {
  checkOut = addMins(shift.clockOut, otHours * 60 + randInt(0, 10));
}
```

**Logic**:
- Nếu có OT → giờ ra = `clockOut` + `otHours * 60 phút` + `[0-10] phút ngẫu nhiên`
- **KHÔNG dùng** `windowEnd` nữa, tính từ `clockOut` chuẩn

**Ví dụ**:
- Ca 1: `clockOut = '16:30'`, `otHours = 2`
- → `checkOut = '16:30' + 120 phút + [0-10] phút`
- → `checkOut ≈ '18:30'` đến `'18:40'`

---

### 5️⃣ ĐIỀU CHỈNH ĐI TRỄ (LATE)

```typescript
if (lateMins > 0) {
  checkIn = addMins(shift.clockIn, lateMins + 15);
}
```

**Logic**:
- Nếu có Late → giờ vào = `clockIn` + `lateMins` + `15 phút`
- **KHÔNG dùng** `windowStart` nữa, tính từ `clockIn` chuẩn

**Ví dụ**:
- Ca 1: `clockIn = '07:30'`, `lateMins = 30`
- → `checkIn = '07:30' + 30 + 15 = '08:15'`

**Lý do +15 phút**: Buffer để đảm bảo thời gian trễ rõ ràng

---

### 6️⃣ ĐIỀU CHỈNH NHÓM ĐẶC THÙ

```typescript
if (groupWorkHours !== null) {
  const reduction = 8 - groupWorkHours;
  if (reduction > 0) {
    checkOut = addMins(checkOut, -reduction * 60);
  }
}
```

**Logic**:
- Nhóm đặc thù có `groupWorkHours < 8` (VD: 7 giờ/ngày cho U18, PREG, NURSG)
- Giảm giờ ra: `reduction = 8 - 7 = 1 giờ`
- → `checkOut = checkOut - 1 * 60 phút`

**Cách tra cứu `groupWorkHours`**:
1. Nhân viên có cột `special_group` (VD: 'U18', 'PREG', 'NURSG')
2. Hệ thống tra cứu bảng `special_groups` theo `code` để lấy `work_hours`
3. Nếu tìm thấy → `groupWorkHours = work_hours` (VD: 7)
4. Nếu không tìm thấy hoặc nhân viên không thuộc nhóm → `groupWorkHours = null`

**Ví dụ**:
- Nhân viên có `special_group = 'U18'`
- Bảng `special_groups`: `{ code: 'U18', name: 'Dưới 18 tuổi', work_hours: 7 }`
- → `groupWorkHours = 7`
- Ca 1: `checkOut = '16:30'`
- → `reduction = 8 - 7 = 1`
- → `checkOut = '16:30' - 60 phút = '15:30'`

**Nhóm đặc thù mặc định**:
- **U18** (Dưới 18 tuổi): 7 giờ/ngày - Bộ luật Lao động điều 146
- **PREG** (Mang thai): 7 giờ/ngày - Bộ luật Lao động điều 137
- **NURSG** (Nuôi con nhỏ < 12 tháng): 7 giờ/ngày - Bộ luật Lao động điều 137

**Lưu ý**: Áp dụng SAU khi đã tính OT

---

### 7️⃣ KIỂM TRA HIỆU LỰC NHÓM ĐẶC THÙ

**File**: `src/app/api/distribution/step/5/route.ts` (line 40-52)

```typescript
// Parse groupCodeEndDate → ngày kết thúc
let endDay: number | null = null;
if (emp.groupCodeEndDate) {
  // Parse dd/mm/yyyy hoặc yyyy-mm-dd
  if (dm === month && dy === year) endDay = dd;
  else if (dy < year || (dy === year && dm < month)) endDay = 0;
}

// Kiểm tra nhóm còn hiệu lực tại ngày d.day không
const groupWorkHours = (endDay === null || d.day <= endDay) 
  ? baseGroupWorkHours 
  : null;
```

**Logic**:
- `endDay = null`: Nhóm còn hiệu lực toàn tháng
- `endDay = 0`: Nhóm đã hết hạn toàn tháng
- `endDay = dd`: Nhóm còn hiệu lực đến ngày `dd`
- Nếu `d.day > endDay` → `groupWorkHours = null` (không áp dụng giảm giờ)

**Ví dụ**:
- `groupCodeEndDate = '15/05/2024'`, tháng hiện tại = `05/2024`
- → Ngày 1-15: áp dụng `groupWorkHours = 6`
- → Ngày 16-31: `groupWorkHours = null` (làm bình thường 8 giờ)

---

## 🔄 QUY TRÌNH THỰC THI

### API: `POST /api/distribution/step/5`

**File**: `src/app/api/distribution/step/5/route.ts`

**Các bước**:

1. **Load dữ liệu**:
   - `params`: Tham số cấu hình
   - `shiftMap`: Danh sách ca làm việc theo phòng ban
   - `specialGroupHours`: Giờ làm của các nhóm đặc thù
   - `emps`: Danh sách nhân viên
   - `allDays`: Dữ liệu ngày từ `distribution_results`

2. **Với mỗi nhân viên**:
   - Lấy `specialGroup` và `groupCodeEndDate`
   - Lấy ca làm việc từ `shiftMap` (theo phòng ban)
   - Với mỗi ngày:
     - Kiểm tra nhóm đặc thù còn hiệu lực không
     - Gọi `step6_generateTime()` để sinh `checkIn`, `checkOut`

3. **Cập nhật database**:
   - Dùng temp table `_tmp_time` để bulk update
   - Cập nhật `check_in`, `check_out` vào `distribution_results`

4. **Đánh dấu hoàn thành**:
   - `markStepDone(monthId, 5)` - Bước 5 xong
   - `markStepDone(monthId, 6)` - Bước 6 xong (vì Bước 6 chỉ là view)

---

## 📐 HÀM HELPER

### `randomTime(startHHMM, endHHMM)`

**Mục đích**: Sinh thời gian ngẫu nhiên trong khoảng `[start, end]`

```typescript
function randomTime(startHHMM: string, endHHMM: string): string {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  const startM = sh * 60 + sm;
  const endM   = eh * 60 + em;
  const r = startM + randInt(0, Math.max(0, endM - startM));
  return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
}
```

**Ví dụ**:
- `randomTime('07:05', '07:30')` → `'07:12'`, `'07:23'`, ...
- `randomTime('16:30', '16:35')` → `'16:31'`, `'16:34'`, ...

---

### `addMins(hhMM, mins)`

**Mục đích**: Cộng/trừ số phút vào thời gian

```typescript
function addMins(hhMM: string, mins: number): string {
  const [h, m] = hhMM.split(':').map(Number);
  const t = h * 60 + m + Math.round(mins);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
```

**Ví dụ**:
- `addMins('07:30', 30)` → `'08:00'`
- `addMins('16:30', 120)` → `'18:30'`
- `addMins('16:30', -120)` → `'14:30'`

---

## 🎯 VÍ DỤ TỔNG HỢP

### Trường hợp 1: Ngày làm bình thường (Ca 1, không OT, không Late)

**Input**:
- `dayType = 0` (X)
- `shiftCode = 'C1'`
- `otHours = 0`
- `lateMins = 0`
- `groupWorkHours = null`
- Ca 1: `windowStart='07:05'`, `clockIn='07:30'`, `clockOut='16:30'`, `windowEnd='16:35'`

**Output**:
- `checkIn` = ngẫu nhiên trong `[07:05, 07:30]` → VD: `'07:15'`
- `checkOut` = ngẫu nhiên trong `[16:30, 16:35]` → VD: `'16:32'`

---

### Trường hợp 2: Có tăng ca 2 giờ

**Input**:
- `dayType = 0` (X)
- `shiftCode = 'C1'`
- `otHours = 2`
- `lateMins = 0`
- `groupWorkHours = null`
- Ca 1: `clockOut='16:30'`

**Output**:
- `checkIn` = ngẫu nhiên trong `[07:05, 07:30]` → VD: `'07:20'`
- `checkOut = '16:30' + 120 phút + [0-10] phút` → VD: `'18:35'`

---

### Trường hợp 3: Có đi trễ 30 phút

**Input**:
- `dayType = 0` (X)
- `shiftCode = 'C1'`
- `otHours = 0`
- `lateMins = 30`
- `groupWorkHours = null`
- Ca 1: `clockIn='07:30'`

**Output**:
- `checkIn = '07:30' + 30 + 15` → `'08:15'`
- `checkOut` = ngẫu nhiên trong `[16:30, 16:35]` → VD: `'16:33'`

---

### Trường hợp 4: Nhóm đặc thù (6 giờ/ngày)

**Input**:
- `dayType = 0` (X)
- `shiftCode = 'C1'`
- `otHours = 0`
- `lateMins = 0`
- `groupWorkHours = 6`
- Ca 1: `clockOut='16:30'`

**Output**:
- `checkIn` = ngẫu nhiên trong `[07:05, 07:30]` → VD: `'07:18'`
- `checkOut = '16:30' - (8-6)*60` → `'14:30'`

---

### Trường hợp 5: Có OT + Nhóm đặc thù

**Input**:
- `dayType = 0` (X)
- `shiftCode = 'C1'`
- `otHours = 2`
- `lateMins = 0`
- `groupWorkHours = 6`
- Ca 1: `clockOut='16:30'`

**Tính toán**:
1. Tính OT trước: `checkOut = '16:30' + 120 phút = '18:30'`
2. Áp dụng giảm giờ: `checkOut = '18:30' - (8-6)*60 = '16:30'`

**Output**:
- `checkIn` = ngẫu nhiên trong `[07:05, 07:30]` → VD: `'07:22'`
- `checkOut = '16:30'`

**Lưu ý**: OT bù đắp giờ giảm của nhóm đặc thù!

---

### Trường hợp 6: Ngày nghỉ LP

**Input**:
- `dayType = 1` (LP)

**Output**:
- `checkIn = '00:00'`
- `checkOut = '00:00'`

---

### Trường hợp 7: Ngày phép năm PN

**Input**:
- `dayType = 2` (PN)

**Output**:
- `checkIn = 'PN'`
- `checkOut = 'PN'`

---

## ✅ KIỂM TRA VALIDATION

**API**: `GET /api/distribution/validate?month=xxx`

**Check**: `check_time` (id: `'check_time'`)

**Điều kiện**:
1. Ngày làm (dayType=0) phải có `checkIn` và `checkOut`
2. `checkIn < checkOut` (tính theo phút)

**Ví dụ vi phạm**:
- `checkIn = ''` hoặc `checkOut = ''` → "Thiếu giờ vào/ra"
- `checkIn = '16:30'`, `checkOut = '16:30'` → "Giờ vào ≥ giờ ra"
- `checkIn = '17:00'`, `checkOut = '16:30'` → "Giờ vào ≥ giờ ra"

---

## 🔧 NÚT "SỬA" TẠI BƯỚC 5

**Chức năng**: Chạy lại Bước 5 để sinh lại giờ vào/ra

**API**: `POST /api/distribution/step/5`

**Khi nào dùng**:
- Có vi phạm check `check_time`
- Muốn sinh lại giờ vào/ra với dữ liệu mới

**Lưu ý**: Sẽ **ghi đè** toàn bộ `check_in`, `check_out` hiện tại

---

## 📝 TÓM TẮT

### Thứ tự áp dụng:
1. ✅ Sinh giờ vào/ra ngẫu nhiên trong khung giờ
2. ✅ Điều chỉnh OT (nếu có) → tăng giờ ra
3. ✅ Điều chỉnh Late (nếu có) → tăng giờ vào
4. ✅ Điều chỉnh nhóm đặc thù (nếu có) → giảm giờ ra

### Nguyên tắc:
- **OT và Late**: Tính từ `clockIn`/`clockOut` chuẩn, KHÔNG dùng window
- **Nhóm đặc thù**: Áp dụng SAU khi đã tính OT
- **Hiệu lực nhóm**: Kiểm tra `groupCodeEndDate` theo từng ngày
- **Ngẫu nhiên**: Mỗi lần chạy sẽ sinh giờ khác nhau (trong khung cho phép)

### Files liên quan:
- `src/app/api/distribution/step/5/route.ts` - API endpoint
- `src/lib/distributionEngine.ts` - Logic sinh giờ
- `src/lib/stepHelpers.ts` - Load shift map
- `src/app/api/distribution/validate/route.ts` - Validation

---

## 📊 BẢNG `special_groups` - NHÓM ĐẶC THÙ

### Schema Database

```sql
CREATE TABLE special_groups (
  id         VARCHAR PRIMARY KEY,
  month_id   VARCHAR NOT NULL,
  code       VARCHAR NOT NULL,      -- Mã nhóm: 'U18', 'PREG', 'NURSG'
  name       VARCHAR NOT NULL,      -- Tên nhóm đầy đủ
  work_hours DOUBLE DEFAULT 8.0,    -- ⭐ Giờ làm/ngày (VD: 7) - QUAN TRỌNG
  note       VARCHAR DEFAULT '',    -- Ghi chú, cơ sở pháp lý
  created_at VARCHAR NOT NULL
)
```

### Dữ liệu mặc định

| code | name | **work_hours** | note |
|------|------|----------------|------|
| 18_DUOI_18 | Dưới 18 tuổi | **7** | Bộ luật Lao động điều 146 |
| 19A_CO_THAI | Mang thai | **7** | Bộ luật Lao động điều 137 |
| 19_NUOI_CON_NHO | Nuôi con nhỏ (< 12 tháng) | **7** | Bộ luật Lao động điều 137 |

**Lưu ý**: Cột **`work_hours`** xác định số giờ làm việc/ngày của nhóm đặc thù (thay vì 8 giờ chuẩn).

### 🔄 QUY TRÌNH XÁC ĐỊNH NHÓM ĐẶC THÙ

#### **Bước 1: Xác định nhân viên thuộc nhóm đặc thù**

**Khi import file Excel**, hệ thống kiểm tra cột **"NHÓM ĐẶC THÙ"**:

```
File Excel:
┌──────────┬─────────────────┬────────────────────┬──────────┐
│ Mã NV    │ Tên NV          │ NHÓM ĐẶC THÙ       │ Ngày công│
├──────────┼─────────────────┼────────────────────┼──────────┤
│ NV001    │ Nguyễn Văn A    │ 18_DUOI_18         │ 26       │  ← Có giá trị
│ NV002    │ Trần Thị B      │ 19A_CO_THAI        │ 24       │  ← Có giá trị
│ NV003    │ Lê Văn C        │                    │ 26       │  ← Trống
└──────────┴─────────────────┴────────────────────┴──────────┘
```

**Logic**:
- **NV001**: Cột "NHÓM ĐẶC THÙ" = '18_DUOI_18' → Nhân viên thuộc nhóm đặc thù
- **NV002**: Cột "NHÓM ĐẶC THÙ" = '19A_CO_THAI' → Nhân viên thuộc nhóm đặc thù
- **NV003**: Cột "NHÓM ĐẶC THÙ" = trống → Nhân viên KHÔNG thuộc nhóm đặc thù

#### **Bước 2: So sánh với bảng `special_groups`**

Hệ thống tra cứu giá trị từ cột "NHÓM ĐẶC THÙ" trong bảng `special_groups`:

```
Bảng special_groups:
┌──────────┬─────────────────────────┬────────────┬─────────────────────────┐
│ code     │ name                    │ work_hours │ note                    │
├──────────┼─────────────────────────┼────────────┼─────────────────────────┤
│ U18      │ Dưới 18 tuổi            │ 7          │ Bộ luật Lao động đ.146  │
│ PREG     │ Mang thai               │ 7          │ Bộ luật Lao động đ.137  │
│ NURSG    │ Nuôi con nhỏ            │ 7          │ Bộ luật Lao động đ.137  │
└──────────┴─────────────────────────┴────────────┴─────────────────────────┘

Tra cứu:
- 'U18' → Tìm thấy: work_hours = 7
- 'PREG' → Tìm thấy: work_hours = 7
- '' (trống) → Không tra cứu
```

**Kết quả lưu vào bảng `employees`**:
```
┌──────────┬─────────────────┬────────────────┬────────────────┐
│ code     │ name            │ special_group  │ work_hours     │
├──────────┼─────────────────┼────────────────┼────────────────┤
│ NV001    │ Nguyễn Văn A    │ U18            │ 7 giờ/ngày     │
│ NV002    │ Trần Thị B      │ PREG           │ 7 giờ/ngày     │
│ NV003    │ Lê Văn C        │ NULL           │ 8 giờ/ngày     │
└──────────┴─────────────────┴────────────────┴────────────────┘
```

#### **Bước 3: Phân bổ giờ vào/ra phù hợp**

Dựa trên `work_hours`, hệ thống tính toán giờ vào/ra:

**NV001 (U18 - 7 giờ/ngày)**:
```
Ca 1 chuẩn: 07:30 → 16:30 (8 giờ)
Nhóm đặc thù: work_hours = 7
→ Giảm: 8 - 7 = 1 giờ
→ Giờ ra mới: 16:30 - 60 phút = 15:30

Kết quả:
checkIn: 07:15 (ngẫu nhiên trong [07:05, 07:30])
checkOut: 15:30 (giảm 1 giờ)
→ Làm việc: 8h15 - 1h = 7h15 (≈ 7 giờ)
```

**NV002 (PREG - 7 giờ/ngày)**:
```
Ca 1 chuẩn: 07:30 → 16:30 (8 giờ)
Nhóm đặc thù: work_hours = 7
→ Giảm: 8 - 7 = 1 giờ
→ Giờ ra mới: 16:30 - 60 phút = 15:30

Kết quả:
checkIn: 07:20 (ngẫu nhiên)
checkOut: 15:30 (giảm 1 giờ)
→ Làm việc: ≈ 7 giờ
```

**NV003 (Không thuộc nhóm - 8 giờ/ngày)**:
```
Ca 1 chuẩn: 07:30 → 16:30 (8 giờ)
Không thuộc nhóm đặc thù
→ Không giảm giờ

Kết quả:
checkIn: 07:18 (ngẫu nhiên)
checkOut: 16:32 (ngẫu nhiên trong [16:30, 16:35])
→ Làm việc: ≈ 8 giờ
```

### 📋 QUY TRÌNH TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IMPORT EXCEL                                             │
│    - Đọc cột "NHÓM ĐẶC THÙ"                                 │
│    - Nếu có giá trị (VD: 'U18') → Lưu vào special_group    │
│    - Nếu trống → special_group = NULL                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TRA CỨU BẢNG special_groups                              │
│    - Lấy giá trị special_group (VD: 'U18')                  │
│    - So sánh với cột 'code' trong special_groups            │
│    - Lấy giá trị 'work_hours' (VD: 7)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. TÍNH TOÁN GIỜ LÀM VIỆC                                   │
│    - Giờ chuẩn: 8 giờ/ngày                                  │
│    - Giờ nhóm đặc thù: work_hours (VD: 7 giờ)              │
│    - Giảm giờ: 8 - 7 = 1 giờ                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SINH GIỜ VÀO/RA                                          │
│    - checkOut chuẩn: 16:30                                  │
│    - checkOut mới: 16:30 - 60 phút = 15:30                  │
│    - Kết quả: Nhân viên làm 7 giờ/ngày thay vì 8 giờ       │
└─────────────────────────────────────────────────────────────┘
```

### 🎯 VÍ DỤ CỤ THỂ

**Tình huống**: Nhân viên mang thai (PREG) làm việc Ca 1

**Dữ liệu**:
- File Excel: Cột "NHÓM ĐẶC THÙ" = 'PREG'
- Bảng special_groups: code='PREG', work_hours=7
- Ca 1: 07:30 → 16:30

**Tính toán**:
```typescript
// Bước 1: Xác định nhóm
emp.special_group = 'PREG'

// Bước 2: Tra cứu work_hours
specialGroupHours.get('PREG') → 7

// Bước 3: Tính giảm giờ
reduction = 8 - 7 = 1 giờ

// Bước 4: Sinh giờ vào/ra
checkIn = randomTime('07:05', '07:30') → '07:18'
checkOut = '16:30' - 60 phút = '15:30'

// Kết quả
Giờ vào: 07:18
Giờ ra: 15:30
Thời gian làm việc: ~7 giờ (phù hợp với quy định)
```

### ⚠️ LƯU Ý QUAN TRỌNG

1. **Cột quan trọng**: `work_hours` trong bảng `special_groups` xác định số giờ làm/ngày
2. **So sánh chính xác**: Giá trị cột "NHÓM ĐẶC THÙ" phải khớp với `code` trong `special_groups`
3. **Không phân biệt hoa thường**: 'U18' = 'u18' = 'U18'
4. **Không tìm thấy**: Nếu giá trị không tồn tại trong `special_groups` → nhân viên làm 8 giờ chuẩn
5. **Áp dụng sau OT**: Giảm giờ được tính SAU khi đã cộng OT (nếu có)

---

**Tài liệu này mô tả đầy đủ giải thuật Bước 5: Sinh giờ vào/ra và cơ chế nhóm đặc thù trong hệ thống phân bổ tự động.**
