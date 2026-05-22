import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
import { placePNAtEndOfRestPeriod } from '@/lib/distributionEngine';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-pn-count
 * Sửa số ngày PN trong distribution_results cho đúng bằng phepNam của NV.
 * - Thừa PN: đổi PN thừa → LP (chọn PN đầu tiên)
 * - Thiếu PN: dùng placePNAtEndOfRestPeriod để thêm PN
 */
export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);

    // Load NV có phepNam > 0
    const emps = await conn.all<{ empId: string; phepNam: number }>(
      `SELECT id AS empId, COALESCE(CAST(phep_nam AS INTEGER), 0) AS phepNam
       FROM employees WHERE month_id = ? AND active = TRUE AND COALESCE(CAST(phep_nam AS INTEGER), 0) > 0`, monthId
    );

    // Load distribution_results
    const allDays = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT employee_id AS empId, day, day_type AS dayType
       FROM distribution_results WHERE month_id = ? ORDER BY employee_id, day`, monthId
    );
    const daysByEmp = new Map<string, { day: number; dayType: number }[]>();
    for (const d of allDays) {
      if (!daysByEmp.has(d.empId)) daysByEmp.set(d.empId, []);
      daysByEmp.get(d.empId)!.push({ day: Number(d.day), dayType: Number(d.dayType) });
    }

    const changes: { empId: string; day: number; dayType: number }[] = [];
    let totalViolating = 0;

    for (const emp of emps) {
      const days = daysByEmp.get(emp.empId) ?? [];
      const pnDays = days.filter(d => d.dayType === 2).map(d => d.day);
      const diff = pnDays.length - emp.phepNam;

      if (diff === 0) continue;
      totalViolating++;

      // Build arrangement array (0-based, length = daysInMonth)
      const arr = Array(daysInMonth).fill(1); // default LP
      for (const d of days) {
        if (d.day >= 1 && d.day <= daysInMonth) arr[d.day - 1] = d.dayType;
      }

      if (diff > 0) {
        // Thừa PN: đổi PN thừa → LP (từ đầu tháng)
        let toRemove = diff;
        for (const pnDay of pnDays.sort((a, b) => a - b)) {
          if (toRemove <= 0) break;
          arr[pnDay - 1] = 1; // PN → LP
          changes.push({ empId: emp.empId, day: pnDay, dayType: 1 });
          toRemove--;
        }
      } else {
        // Thiếu PN: dùng placePNAtEndOfRestPeriod để thêm
        const needed = -diff;
        // Xóa PN hiện có để placePNAtEndOfRestPeriod đặt lại đúng số
        for (let i = 0; i < daysInMonth; i++) {
          if (arr[i] === 2) arr[i] = 1; // PN → LP tạm
        }
        const fixed = placePNAtEndOfRestPeriod(arr, daysInMonth, params, emp.phepNam);
        // Ghi lại tất cả thay đổi so với arr gốc
        for (let i = 0; i < daysInMonth; i++) {
          const origDayType = days.find(d => d.day === i + 1)?.dayType ?? -1;
          if (fixed[i] !== origDayType) {
            changes.push({ empId: emp.empId, day: i + 1, dayType: fixed[i] });
          }
        }
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, fixed: 0 });
    }

    await conn.run('BEGIN TRANSACTION');
    try {
      for (const c of changes) {
        await conn.run(
          `UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
          c.dayType, monthId, c.empId, c.day
        );
      }
      await conn.run('COMMIT');
    } catch (e) { await conn.run('ROLLBACK'); throw e; }

    const fixedEmps = new Set(changes.map(c => c.empId)).size;
    await conn.close();
    return NextResponse.json({ ok: true, fixed: fixedEmps, total: totalViolating });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
