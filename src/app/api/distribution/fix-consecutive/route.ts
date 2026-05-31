import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-consecutive
 * Tìm NV có run ngày X > maxConsecutiveDays, hoán đổi ngày X cuối run
 * với một ngày LP khác trong tháng (ưu tiên LP gần nhất sau run).
 * Swap giữ nguyên tổng X và LP — không phá vỡ workdays hay lp_balance.
 *
 * FIX: PN (dayType=2) cũng là ngày nghỉ → reset run như LP.
 * 
 * RÀNG BUỘC QUAN TRỌNG:
 * - CHỈ được thay đổi: X (0), LP (1), PN (2) - dữ liệu tự sinh
 * - TUYỆT ĐỐI KHÔNG thay đổi: dayType ≥ 3 - dữ liệu đầu vào cố định (Ô, TS, DS, O, NL, OF, P, ...)
 * - CHỈ swap X (0) ↔ LP (1)
 */
export async function POST(req: NextRequest) {
  const { monthId, empCodes } = await req.json() as { monthId: string; empCodes?: string[] };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
  const filterSet = empCodes ? new Set(empCodes.map(c => c.trim().toUpperCase())) : null;

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);
    const max = params.maxConsecutiveDays;

    // Load employee code map để lọc theo empCodes
    const empCodeRows = await conn.all<{ id: string; code: string }>(
      `SELECT id, code FROM employees WHERE month_id = ?`, monthId
    );
    const empIdToCode = new Map(empCodeRows.map(e => [e.id, e.code.toUpperCase()]));

    const drRows = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT dr.employee_id AS empId, dr.day, dr.day_type AS dayType
       FROM distribution_results dr
       WHERE dr.month_id = ?
       ORDER BY dr.employee_id, dr.day`, monthId
    );

    // Group by empId → mảng dayType[0..daysInMonth-1]
    const empMap = new Map<string, number[]>();
    for (const r of drRows) {
      if (!empMap.has(r.empId)) empMap.set(r.empId, Array(daysInMonth).fill(-1));
      if (r.day >= 1 && r.day <= daysInMonth) empMap.get(r.empId)![r.day - 1] = Number(r.dayType);
    }

    const changes: { empId: string; day: number; dayType: number }[] = [];

    // Hàm kiểm tra 1 ngày có phải "ngày làm" không (chỉ dayType=0 là làm)
    const isWork = (dt: number) => dt === 0;

    // Đếm tổng NV vi phạm trước khi sửa (chỉ trong tháng, không xét liên tháng)
    let totalViolating = 0;
    for (const [empId, arr] of empMap) {
      if (filterSet && !filterSet.has(empIdToCode.get(empId) ?? '')) continue;
      let run = 0;
      let violated = false;
      for (let i = 0; i < daysInMonth; i++) {
        if (isWork(arr[i])) { run++; if (run > max) { violated = true; break; } }
        else run = 0;
      }
      if (violated) totalViolating++;
    }

    for (const [empId, arr] of empMap) {
      if (filterSet && !filterSet.has(empIdToCode.get(empId) ?? '')) continue;
      let maxIter = 50;
      let changed = true;
      while (changed && maxIter-- > 0) {
        changed = false;
        let run = 0;
        let runStart = 0;

        for (let i = 0; i < daysInMonth; i++) {
          if (isWork(arr[i])) {
            if (run === 0) runStart = i;
            run++;
            if (run > max) {
              // Vị trí cần chèn LP: ngày thứ max+1 trong run (tính từ đầu tháng)
              const insertPos = Math.max(0, runStart + max);
              
              // CHỈ swap nếu insertPos là ngày làm (X=0)
              // KHÔNG swap nếu là PN(2) hoặc các loại đặc biệt(3-9)
              if (arr[insertPos] === 0) {
                // Tìm LP để swap: ưu tiên LP ngay sau run, rồi LP trước run
                // CHÚ Ý: CHỈ tìm LP (dayType=1), KHÔNG swap với PN(2) hoặc các loại đặc biệt(3-9)
                let lpIdx = -1;
                for (let j = i + 1; j < daysInMonth; j++) {
                  if (arr[j] === 1) { lpIdx = j; break; }
                }
                if (lpIdx === -1) {
                  for (let j = (runStart > 0 ? runStart - 1 : 0); j >= 0; j--) {
                    if (arr[j] === 1) { lpIdx = j; break; }
                  }
                }
                if (lpIdx !== -1) {
                  arr[insertPos] = 1;  // X → LP
                  arr[lpIdx] = 0;      // LP → X
                  changes.push({ empId, day: insertPos + 1, dayType: 1 });
                  changes.push({ empId, day: lpIdx + 1, dayType: 0 });
                  changed = true;
                  break; // restart scan cho NV này
                }
                // Không có LP để swap → không sửa được
              }
              break;
            }
          } else {
            run = 0;
            runStart = i + 1;
          }
        }
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, fixed: 0, total: totalViolating, message: 'Không có vi phạm nào cần sửa' });
    }

    // Gộp changes theo (empId, day) — lấy giá trị cuối nếu trùng
    const changeMap = new Map<string, number>();
    for (const c of changes) changeMap.set(`${c.empId}_${c.day}`, c.dayType);

    for (const [key, dayType] of changeMap) {
      const underscoreIdx = key.indexOf('_');
      const empId = key.slice(0, underscoreIdx);
      const dayStr = key.slice(underscoreIdx + 1);
      await conn.run(
        `UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
        dayType, monthId, empId, Number(dayStr)
      );
    }

    // Kiểm tra lại sau khi sửa — NV nào vẫn còn vi phạm
    const unresolved: { code: string; name: string; deptName: string }[] = [];
    for (const [empId, arr] of empMap) {
      let run = 0, stillViolating = false;
      for (let i = 0; i < daysInMonth; i++) {
        if (isWork(arr[i])) { run++; if (run > max) { stillViolating = true; break; } }
        else run = 0;
      }
      if (stillViolating) {
        unresolved.push({ code: empId, name: '', deptName: '' });
      }
    }

    const trulyFixed = totalViolating - unresolved.length;
    await conn.close();
    return NextResponse.json({ ok: true, fixed: trulyFixed, total: totalViolating, changes: changeMap.size, unresolved });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
