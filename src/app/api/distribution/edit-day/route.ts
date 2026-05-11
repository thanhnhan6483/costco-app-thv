import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

/**
 * PATCH /api/distribution/edit-day
 * Body: { monthId, changes: [{ empCode, day, dayType }] }
 * Cập nhật day_type trong distribution_results cho từng NV/ngày.
 */
export async function PATCH(req: NextRequest) {
  const { monthId, changes } = await req.json() as {
    monthId: string;
    changes: { empCode: string; day: number; dayType: number }[];
  };

  if (!monthId || !changes?.length) {
    return NextResponse.json({ error: 'Thiếu monthId hoặc changes' }, { status: 400 });
  }

  const conn = await getConn();
  try {
    // Tra cứu empCode → empId
    const codes = [...new Set(changes.map(c => c.empCode))];
    const placeholders = codes.map(() => '?').join(',');
    const empRows = await conn.all<{ id: string; code: string }>(
      `SELECT id, code FROM employees WHERE month_id = ? AND code IN (${placeholders})`,
      monthId, ...codes,
    );
    const codeToId = new Map(empRows.map(e => [e.code, e.id]));

    let updated = 0;
    for (const c of changes) {
      const empId = codeToId.get(c.empCode);
      if (!empId) continue;

      await conn.run(
        `UPDATE distribution_results
         SET day_type = ?
         WHERE month_id = ? AND employee_id = ? AND day = ?`,
        c.dayType, monthId, empId, c.day,
      );
      updated++;
    }

    await conn.close();
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
