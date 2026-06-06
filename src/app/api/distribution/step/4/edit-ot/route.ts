import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  const { monthId, changes } = await req.json() as {
    monthId: string;
    changes: { code: string; day: number; otH?: number; lateM?: number }[];
  };

  if (!monthId || !changes?.length) {
    return NextResponse.json({ error: 'Missing monthId or changes' }, { status: 400 });
  }

  const conn = await getConn();
  try {
    const codes = [...new Set(changes.map(c => c.code))];
    const placeholders = codes.map(() => '?').join(',');
    const empRows = await conn.all(
      `SELECT id, code FROM employees WHERE month_id = ? AND code IN (${placeholders})`,
      monthId, ...codes,
    ) as { id: string; code: string }[];
    const codeToId = new Map(empRows.map(e => [e.code, e.id]));

    let updated = 0;
    for (const c of changes) {
      const empId = codeToId.get(c.code);
      if (!empId) continue;

      const existing = await conn.all(
        `SELECT id FROM distribution_results WHERE month_id = ? AND employee_id = ? AND day = ?`,
        monthId, empId, c.day,
      );
      if (existing.length > 0) {
        const sets: string[] = [];
        const params: (string | number)[] = [];
        if (c.otH !== undefined) { sets.push('ot_hours = ?'); params.push(c.otH); }
        if (c.lateM !== undefined) { sets.push('late_mins = ?'); params.push(c.lateM); }
        if (sets.length > 0) {
          await conn.run(
            `UPDATE distribution_results SET ${sets.join(', ')} WHERE month_id = ? AND employee_id = ? AND day = ?`,
            ...params, monthId, empId, c.day,
          );
        }
      }
      updated++;
    }

    await conn.close();
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
