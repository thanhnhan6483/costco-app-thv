# 🔧 Sửa Logic `lp_balance` - Cân Bằng Ngày Nghỉ Theo Ngày

## ❌ Logic Hiện Tại (SAI)

### **Đang kiểm tra:**
Tổng số ngày LP trong THÁNG của mỗi NV

```typescript
// Đếm tổng LP của từng NV
const lpCount = emp.days.filter(d => d.dayType === 1).length;

// Ví dụ:
NV001: 3 ngày LP trong tháng (ngày 5, 12, 19)
NV002: 5 ngày LP trong tháng (ngày 3, 10, 17, 24, 31)
→ Chênh 2 ngày → VI PHẠM ❌
```

### **Vấn đề:**
- Không phản ánh cân bằng số người nghỉ/làm theo từng ngày
- Không đảm bảo luôn có đủ người làm việc mỗi ngày

---

## ✅ Logic Đúng (Theo Yêu Cầu)

### **Cần kiểm tra:**
Số người nghỉ/làm THEO TỪNG NGÀY trong phòng

```typescript
// Với mỗi NGÀY, đếm số NV làm vs nghỉ
// Ví dụ Phòng KD có 10 người:

Ngày 1:
- 5 người làm (X)
- 5 người nghỉ (LP)
→ Cân bằng OK ✅

Ngày 2:
- 2 người làm (X)
- 8 người nghỉ (LP)
→ Mất cân bằng (chênh 6 người) ❌

Ngày 3:
- 9 người làm (X)
- 1 người nghỉ (LP)
→ Mất cân bằng (chênh 8 người) ❌
```

---

## 🔧 Code Mới

### **Logic kiểm tra:**

```typescript
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Check: Cân bằng số người nghỉ/làm theo từng ngày
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const checkDailyBalance: CheckResult = {
  id: 'lp_balance',
  label: `Cân bằng ngày nghỉ trong phòng (chênh ≤ ${params.maxDayOffDifference} người)`,
  description: 'Số NV nghỉ/làm mỗi ngày trong phòng không chênh lệch quá nhiều',
  status: 'ok', violations: [], violationCount: 0, checkedCount: totalEmps,
};

// Nhóm NV theo phòng ban
const skipCodes = new Set(params.skipEqualRestDeptCodes.map(c => c.toUpperCase()));
const deptEmps = new Map<string, string[]>(); // deptId → empIds
for (const emp of emps) {
  const dept = deptMap.get(emp.deptId);
  if (!dept || skipCodes.has(dept.code.toUpperCase())) continue;
  if (!deptEmps.has(emp.deptId)) deptEmps.set(emp.deptId, []);
  deptEmps.get(emp.deptId)!.push(emp.empId);
}

// Với mỗi phòng, kiểm tra cân bằng theo từng ngày
for (const [deptId, memberIds] of deptEmps) {
  if (memberIds.length < 2) continue;
  const deptName = deptMap.get(deptId)?.name ?? '—';
  
  // Với mỗi ngày trong tháng
  for (let day = 1; day <= daysInMonth; day++) {
    let workCount = 0;  // Số người làm (X)
    let restCount = 0;  // Số người nghỉ (LP, PN, NL...)
    
    for (const empId of memberIds) {
      const emp = emps.find(e => e.empId === empId);
      if (!emp) continue;
      
      const dayData = emp.days.find(d => d.day === day);
      if (!dayData) continue;
      
      if (dayData.dayType === 0) {
        workCount++; // Ngày làm (X)
      } else {
        restCount++; // Ngày nghỉ (LP, PN, NL, Ô, TS...)
      }
    }
    
    const total = workCount + restCount;
    if (total === 0) continue; // Không có data
    
    // Tính chênh lệch
    const diff = Math.abs(workCount - restCount);
    const maxAllowedDiff = Math.floor(total * 0.4); // Cho phép chênh tối đa 40%
    
    // Hoặc dùng tham số maxDayOffDifference (nếu là số người)
    // const maxAllowedDiff = params.maxDayOffDifference;
    
    if (diff > maxAllowedDiff) {
      checkDailyBalance.violations.push({
        code: '—',
        name: deptName,
        deptName,
        day,
        detail: `Ngày ${day}: ${workCount} người làm, ${restCount} người nghỉ (chênh ${diff} người, vượt ${maxAllowedDiff})`,
      });
    }
  }
}

checkDailyBalance.violationCount = checkDailyBalance.violations.length;
checkDailyBalance.status = checkDailyBalance.violationCount === 0 ? 'ok' : 'warning';
results.push(checkDailyBalance);
```

---

## 📊 Ví Dụ Cụ Thể

### **Phòng KD có 10 người:**

```
Ngày 1:
- NV001, NV002, NV003, NV004, NV005: X (làm)
- NV006, NV007, NV008, NV009, NV010: LP (nghỉ)
→ 5 làm, 5 nghỉ → Chênh 0 → OK ✅

Ngày 2:
- NV001, NV002: X (làm)
- NV003, NV004, NV005, NV006, NV007, NV008, NV009, NV010: LP (nghỉ)
→ 2 làm, 8 nghỉ → Chênh 6 → VI PHẠM ❌

Ngày 3:
- NV001, NV002, NV003, NV004, NV005, NV006, NV007, NV008, NV009: X (làm)
- NV010: LP (nghỉ)
→ 9 làm, 1 nghỉ → Chênh 8 → VI PHẠM ❌
```

---

## 🎯 Ngưỡng Chênh Lệch

### **Cách 1: Theo phần trăm**
```typescript
const maxAllowedDiff = Math.floor(total * 0.4); // 40%

// Ví dụ 10 người:
// - Cho phép chênh tối đa: 4 người
// - 7 làm, 3 nghỉ → Chênh 4 → OK
// - 8 làm, 2 nghỉ → Chênh 6 → VI PHẠM
```

### **Cách 2: Theo số người cố định**
```typescript
const maxAllowedDiff = params.maxDayOffDifference; // Ví dụ: 3 người

// Ví dụ 10 người:
// - Cho phép chênh tối đa: 3 người
// - 6 làm, 4 nghỉ → Chênh 2 → OK
// - 7 làm, 3 nghỉ → Chênh 4 → VI PHẠM
```

### **Cách 3: Kết hợp (khuyến nghị)**
```typescript
// Cho phép chênh tối đa 40% HOẶC maxDayOffDifference (lấy giá trị lớn hơn)
const maxAllowedDiff = Math.max(
  Math.floor(total * 0.4),
  params.maxDayOffDifference
);
```

---

## 🔧 API Fix Mới

### **Logic sửa:**

```typescript
// Với mỗi ngày vi phạm, swap X ↔ LP giữa các NGÀY của cùng NV để cân bằng
// CHÚ Ý: CHỈ swap với LP (dayType=1), KHÔNG swap với PN (dayType=2)
// Ví dụ Ngày 2: 2 làm, 8 nghỉ → Cần swap 3 cặp

for (const violation of violations) {
  const { deptId, day, workCount, restCount } = violation;
  
  // Tính số cặp cần swap
  const diff = Math.abs(workCount - restCount);
  const swapCount = Math.floor(diff / 2);
  
  if (workCount < restCount) {
    // Quá nhiều người nghỉ → Chuyển LP → X
    // Tìm NV đang nghỉ LP (dayType=1) ngày này
    const restingEmps = memberIds.filter(empId => {
      const dayData = getEmpDay(empId, day);
      return dayData?.dayType === 1; // CHỈ LP, KHÔNG PN
    });
    
    // Tìm ngày khác mà NV này đang làm (X) để swap
    for (let i = 0; i < swapCount && i < restingEmps.length; i++) {
      const empId = restingEmps[i];
      
      // Kiểm tra consecutive trước khi swap
      if (!canSwapToWork(empId, day)) continue;
      
      // Tìm ngày khác có ít người nghỉ để swap
      for (let otherDay = 1; otherDay <= daysInMonth; otherDay++) {
        if (otherDay === day) continue;
        
        const otherDayData = getEmpDay(empId, otherDay);
        if (otherDayData?.dayType === 0) { // Đang làm (X)
          // Kiểm tra không tạo vi phạm mới ở ngày kia
          if (wouldCreateViolation(deptId, otherDay, -1, +1)) continue;
          
          // Swap: ngày này LP→X, ngày kia X→LP
          updateDayType(empId, day, 0);      // LP → X
          updateDayType(empId, otherDay, 1); // X → LP
          break;
        }
      }
    }
  } else {
    // Quá nhiều người làm → Chuyển X → LP
    // Logic tương tự nhưng ngược lại
  }
}
```

### **Các kiểm tra quan trọng:**

1. ✅ **Kiểm tra consecutive:** `canSwapToWork()` đảm bảo không vi phạm 6 ngày liên tiếp
2. ✅ **Kiểm tra không tạo vi phạm mới:** Ngày được swap đến không bị mất cân bằng
3. ✅ **CHỈ swap với LP (dayType=1):** KHÔNG swap với PN (dayType=2) để giữ nguyên số ngày phép năm
4. ✅ **Không thay đổi workdays:** Tổng số ngày làm của mỗi NV giữ nguyên

---

## ⚠️ Lưu Ý

### **Các ràng buộc quan trọng:**
1. ✅ **KHÔNG thay đổi workdays:** Tổng số ngày làm (X) của mỗi NV giữ nguyên
2. ✅ **KHÔNG thay đổi số ngày PN:** CHỈ swap với LP (dayType=1), KHÔNG swap với PN (dayType=2)
3. ✅ **KHÔNG thay đổi dữ liệu cố định:** KHÔNG swap với các loại nghỉ đặc biệt (dayType 3-9)
4. ✅ **KHÔNG vi phạm consecutive:** Kiểm tra trước khi swap để đảm bảo ≤ 6 ngày liên tiếp
5. ✅ **KHÔNG tạo vi phạm mới:** Kiểm tra ngày được swap đến không bị mất cân bằng

### **DayType mapping:**
```
// ✅ DỮ LIỆU TỰ SINH - CÓ THỂ THAY ĐỔI
0 = X   (Làm việc) ← Có thể swap
1 = LP  (Nghỉ lễ/Chủ nhật) ← CHỈ swap với loại này
2 = PN  (Phép năm) ← KHÔNG swap

// ❌ DỮ LIỆU ĐẦU VÀO CỐ ĐỊNH - TUYỆT ĐỐI KHÔNG THAY ĐỔI
≥3 = Ô, TS, DS, O, NL, OF, P, ... ← Tất cả các loại nghỉ đặc biệt
```

### **Giải pháp đúng:**
1. ✅ **Kiểm tra và cảnh báo** (không tự động sửa nếu không thể swap an toàn)
2. ✅ **Swap X ↔ LP giữa các NGÀY của cùng NV** (không phải giữa các NV)
3. ✅ **Điều chỉnh giải thuật phân bổ** (Bước 2) để cân bằng ngay từ đầu
4. ✅ **Sửa thủ công** nếu cần thiết

---

## 🎯 Kết Luận

### **Logic cũ (SAI):**
- Kiểm tra tổng số ngày LP trong tháng
- Không phản ánh cân bằng theo ngày

### **Logic mới (ĐÚNG):**
- Kiểm tra số người nghỉ/làm THEO TỪNG NGÀY
- Đảm bảo luôn có đủ người làm việc mỗi ngày

### **API Fix (ĐÚNG):**
- ✅ SWAP X ↔ LP giữa các NGÀY của cùng NV (không phải giữa các NV)
- ✅ CHỈ swap với LP (dayType=1), KHÔNG swap với PN (dayType=2)
- ✅ Kiểm tra consecutive trước khi swap (≤ 6 ngày)
- ✅ Kiểm tra không tạo vi phạm mới ở ngày được swap đến
- ✅ KHÔNG thay đổi workdays (tổng số ngày làm giữ nguyên)
- ✅ KHÔNG thay đổi số ngày phép năm (phepNam)

### **Khuyến nghị:**
- ✅ Sử dụng API fix-lp-balance để tự động sửa vi phạm cân bằng
- ✅ Nếu không thể swap (vi phạm consecutive hoặc tạo vi phạm mới) → Sửa thủ công
- ✅ Cải thiện giải thuật phân bổ (Bước 2) để cân bằng tốt hơn từ đầu

---

**Ngày tạo:** 2026-05-27  
**Phiên bản:** 2.0  
**Cập nhật:** Thêm ràng buộc CHỈ swap với LP, KHÔNG swap với PN
