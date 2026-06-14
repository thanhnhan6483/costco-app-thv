# Fix: greedyAssignLP kiểm tra gapAfter sai

## Root Cause
`greedyAssignLP` kiểm tra `gapAfter` khi chưa đặt LP tiếp theo, khiến
không ngày nào thỏa cả `gapBefore ≤ maxConsecutiveDays` và `gapAfter ≤ maxConsecutiveDays`
cho LP đầu tiên → greedy `break`, không đặt LP nào → tất cả là X.

## Fix
**File:** `src/lib/distributionEngine.ts`
**Hàm:** `greedyAssignLP` (dòng ~460-469)

Xoá biến `next`, `gapAfter`, và điều kiện `|| gapAfter > maxConsecutiveDays`.
Chỉ giữ kiểm tra `gapBefore`.

## Tác động
- `greedyAssignLP`: bỏ gapAfter
- `checkLPGaps`: giữ nguyên (dùng cho repair, kiểm tra toàn cục)
- `step1Worker.ts`: không đổi
- `step/2/route.ts`: không đổi

## Verify
- `npm run build:worker`
- `npx tsc --noEmit 2>&1 | Select-Object -First 10`
