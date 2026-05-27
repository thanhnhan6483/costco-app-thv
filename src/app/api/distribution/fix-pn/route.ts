import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
import { placePNAtEndOfRestPeriod } from '@/lib/distributionEngine';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-pn
 * Tìm NV có PN trước pnStartFromDay, đặt lại PN đúng vị trí.
 *
 * FIX: default ngày không có data dùng LP=1 thay vì X=0 để tránh tạo ngày làm giả.
 * 
 * RÀNG BUỘC QUAN TRỌNG:
 * - CHỈ được thay đổi: X (0), LP (1), PN (2) - dữ liệu tự sinh
 * - TUYỆT ĐỐI KHÔNG thay đổi: dayType ≥ 3 - dữ liệu đầu vào cố định (Ô, TS, DS, O, NL, OF, P, ...)
 */
export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);

    const rawRows = await conn.all<{ empId: string; empCode: string; day: number; dayType: number }>(
      `SELECT dr.employee_id AS empId, e.code AS empCode, dr.day, dr.day_type AS dayType
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       WHERE dr.month_id = ?
       ORDER BY e.code, dr.day`, monthId
    );

    // Group by empId
    const empMap = new Map<string, { empId: string; code: string; days: Map<number, number> }>();
    for (const r of rawRows) {
      if (!empMap.has(r.empId)) empMap.set(r.empId, { empId: r.empId, code: r.empCode, days: new Map() });
      empMap.get(r.empId)!.days.set(r.day, r.dayType);
    }

    const toFix: { empId: string; code: string; arrangement: number[]; phepNam: number }[] = [];

    for (const emp of empMap.values()) {
      const pnDays = Array.from(emp.days.entries())
        .filter(([, dt]) => dt === 2)
        .map(([day]) => day);
      if (pnDays.length === 0) continue;

      const violated = pnDays.some(d => d < params.pnStartFromDay);
      if (!violated) continue;

      const phepNam = pnDays.length || 1;

      // FIX: build arrangement — ngày không có data dùng LP=1 (không tạo ngày làm giả)
      // PN → LP tạm để placePNAtEndOfRestPeriod tái đặt
      const arrangement = Array.from({ length: daysInMonth }, (_, i) => {
        const dt = emp.days.get(i + 1);
        if (dt === undefined) return 1;  // FIX: default LP thay vì X
        if (dt === 2) return 1;          // PN → LP tạm
        return dt;
      });

      toFix.push({ empId: emp.empId, code: emp.code, arrangement, phepNam });
    }

    if (toFix.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, fixed: 0, message: 'Không có vi phạm PN nào cần sửa' });
    }

    let fixed = 0;
    for (const emp of toFix) {
      const fixed_arr = placePNAtEndOfRestPeriod(emp.arrangement, daysInMonth, params, emp.phepNam);

      for (let i = 0; i < daysInMonth; i++) {
        const day = i + 1;
        const oldDT = empMap.get(emp.empId)!.days.get(day) ?? -1;
        const newDT = fixed_arr[i];
        if (newDT !== oldDT && oldDT >= 0) {
          await conn.run(
            `UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
            newDT, monthId, emp.empId, day
          );
        }
      }
      fixed++;
    }

    await conn.close();
    return NextResponse.json({ ok: true, fixed, total: toFix.length });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
