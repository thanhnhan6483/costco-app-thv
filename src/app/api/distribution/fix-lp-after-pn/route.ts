import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-lp-after-pn
 *
 * Quy tắc: PN phải đứng SAU tất cả LP (không có LP nào sau PN).
 *
 * Giải thuật:
 *   Với mỗi NV vi phạm:
 *   - Tìm LP đứng sau PN → đây là LP cần "đẩy PN ra sau".
 *   - Swap: LP đó ↔ PN (đổi chỗ LP và PN cho nhau).
 *   - Lặp cho đến khi không còn LP nào sau PN đầu tiên.
 *   → Số lượng LP và PN giữ nguyên tuyệt đối.
 */
export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const { daysInMonth } = await loadMonthInfo(monthId);

    const rawRows = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT dr.employee_id AS empId, dr.day, dr.day_type AS dayType
       FROM distribution_results dr
       WHERE dr.month_id = ? ORDER BY dr.employee_id, dr.day`, monthId
    );

    const empMap = new Map<string, Map<number, number>>();
    for (const r of rawRows) {
      if (!empMap.has(r.empId)) empMap.set(r.empId, new Map());
      empMap.get(r.empId)!.set(r.day, Number(r.dayType));
    }

    let fixed = 0;
    for (const [empId, days] of empMap) {
      const arr = Array.from({ length: daysInMonth }, (_, i) => {
        const v = days.get(i + 1);
        return v !== undefined ? v : -1;
      });

      // Kiểm tra vi phạm ban đầu
      const firstPnIdx = arr.indexOf(2);
      if (firstPnIdx < 0) continue;
      if (!arr.some((v, i) => v === 1 && i > firstPnIdx)) continue;

      // Swap LP↔PN cho đến khi không còn LP nào sau PN đầu tiên
      // Mỗi lần: tìm PN đầu tiên, tìm LP cuối cùng sau PN đó → swap
      let changed = false;
      let iterations = 0;
      while (iterations++ < daysInMonth) {
        const pnIdx = arr.indexOf(2);
        if (pnIdx < 0) break;
        // Tìm LP cuối cùng sau pnIdx
        let lastLpAfterPn = -1;
        for (let i = daysInMonth - 1; i > pnIdx; i--) {
          if (arr[i] === 1) { lastLpAfterPn = i; break; }
        }
        if (lastLpAfterPn < 0) break; // không còn LP sau PN → xong

        // Swap PN ↔ LP
        arr[pnIdx] = 1;          // PN → LP
        arr[lastLpAfterPn] = 2;  // LP → PN
        changed = true;
      }

      if (!changed) continue;

      // Cập nhật DB chỉ những ngày thay đổi
      for (let i = 0; i < daysInMonth; i++) {
        const day = i + 1;
        const oldDT = days.get(day);
        if (oldDT === undefined) continue;
        if (arr[i] !== oldDT) {
          await conn.run(
            `UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
            arr[i], monthId, empId, day
          );
        }
      }
      fixed++;
    }

    await conn.close();
    return NextResponse.json({ ok: true, fixed });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
