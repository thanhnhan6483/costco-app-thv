import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-consecutive
 * Tìm NV có run ngày X > maxConsecutiveDays, hoán đổi ngày X cuối run
 * với một ngày LP khác trong tháng (ưu tiên LP gần nhất sau run).
 * Swap giữ nguyên tổng X và LP — không phá vỡ workdays hay lp_balance.
 */
export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);
    const max = params.maxConsecutiveDays;

    const drRows = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT dr.employee_id AS empId, dr.day, dr.day_type AS dayType
       FROM distribution_results dr
       WHERE dr.month_id = ?
       ORDER BY dr.employee_id, dr.day`, monthId
    );

    const empInfoRows = await conn.all<{ id: string; code: string; name: string; deptName: string }>(
      `SELECT e.id, e.code, e.name, COALESCE(d.name, '') AS deptName
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.month_id = ?`, monthId
    );
    const empInfoMap = new Map(empInfoRows.map(e => [e.id, e]));

    // Group by empId → mảng dayType[0..daysInMonth-1]
    const empMap = new Map<string, number[]>();
    for (const r of drRows) {
      if (!empMap.has(r.empId)) empMap.set(r.empId, Array(daysInMonth).fill(-1));
      if (r.day >= 1 && r.day <= daysInMonth) empMap.get(r.empId)![r.day - 1] = Number(r.dayType);
    }

    const changes: { empId: string; day: number; dayType: number }[] = [];

    // Đếm tổng NV vi phạm trước khi sửa
    let totalViolating = 0;
    for (const [, arr] of empMap) {
      let run = 0;
      for (let i = 0; i < daysInMonth; i++) {
        if (arr[i] === 0) { run++; if (run > max) { totalViolating++; break; } }
        else run = 0;
      }
    }

    for (const [empId, arr] of empMap) {
      let maxIter = 50; // tránh vòng lặp vô hạn
      let changed = true;
      while (changed && maxIter-- > 0) {
        changed = false;
        let run = 0; let runStart = 0;
        for (let i = 0; i < daysInMonth; i++) {
          if (arr[i] === 0) {
            if (run === 0) runStart = i;
            run++;
            if (run > max) {
              // Tìm LP để swap: ưu tiên LP ngay sau run, rồi LP trước run
              let lpIdx = -1;
              for (let j = i + 1; j < daysInMonth; j++) {
                if (arr[j] === 1) { lpIdx = j; break; }
              }
              if (lpIdx === -1) {
                for (let j = runStart - 1; j >= 0; j--) {
                  if (arr[j] === 1) { lpIdx = j; break; }
                }
              }
              if (lpIdx !== -1) {
                // Swap: ngày X cuối run → LP, ngày LP tìm được → X
                arr[i] = 1;
                arr[lpIdx] = 0;
                changes.push({ empId, day: i + 1, dayType: 1 });
                changes.push({ empId, day: lpIdx + 1, dayType: 0 });
                changed = true;
                break; // restart scan cho NV này
              }
              // Không có LP để swap → không sửa được (hiếm)
            }
          } else {
            run = 0;
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
      const [empId, dayStr] = key.split('_');
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
        if (arr[i] === 0) { run++; if (run > max) { stillViolating = true; break; } }
        else run = 0;
      }
      if (stillViolating) {
        const info = empInfoMap.get(empId);
        unresolved.push({ code: info?.code ?? empId, name: info?.name ?? '', deptName: info?.deptName ?? '' });
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
