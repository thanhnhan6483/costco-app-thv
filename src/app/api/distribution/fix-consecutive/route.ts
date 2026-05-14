import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-consecutive
 * Tìm NV có run ngày làm (X) > maxConsecutiveDays, chèn LP vào cuối mỗi run vi phạm.
 * Chỉ sửa NV vi phạm, không ảnh hưởng NV đã đúng.
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

    // Group by empId
    const empMap = new Map<string, number[]>();
    for (const r of drRows) {
      if (!empMap.has(r.empId)) empMap.set(r.empId, Array(daysInMonth).fill(-1));
      if (r.day >= 1 && r.day <= daysInMonth) empMap.get(r.empId)![r.day - 1] = r.dayType;
    }

    const changes: { empId: string; day: number; dayType: number }[] = [];

    for (const [empId, arr] of empMap) {
      // Lặp cho đến khi không còn vi phạm
      let changed = true;
      while (changed) {
        changed = false;
        let run = 0;
        for (let i = 0; i < daysInMonth; i++) {
          if (arr[i] === 0) {
            run++;
            if (run > max) {
              // Chèn LP tại vị trí này (cuối run vi phạm)
              arr[i] = 1;
              changes.push({ empId, day: i + 1, dayType: 1 });
              run = 0;
              changed = true;
            }
          } else {
            run = 0;
          }
        }
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, fixed: 0, message: 'Không có vi phạm ngày liên tiếp nào cần sửa' });
    }

    for (const c of changes) {
      await conn.run(
        `UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
        c.dayType, monthId, c.empId, c.day
      );
    }

    const fixedEmps = new Set(changes.map(c => c.empId)).size;
    await conn.close();
    return NextResponse.json({ ok: true, fixed: fixedEmps, changes: changes.length });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
