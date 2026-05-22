import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

// PATCH /api/distribution/edit-day-import
// Body: { monthId, changes: [{ empCode, day, symbol }] }
export async function PATCH(req: NextRequest) {
  const { monthId, changes } = await req.json() as {
    monthId: string;
    changes: { empCode: string; day: number; symbol: string }[];
  };
  if (!monthId || !Array.isArray(changes) || changes.length === 0)
    return NextResponse.json({ error: 'Thiếu tham số' }, { status: 400 });

  const conn = await getConn();
  try {
    await conn.run('BEGIN TRANSACTION');
    for (const { empCode, day, symbol } of changes) {
      if (day < 1 || day > 31) continue;
      await conn.run(
        `UPDATE employees SET day_${day} = ? WHERE month_id = ? AND code = ?`,
        symbol, monthId, empCode
      );
    }
    await conn.run('COMMIT');
    await conn.close();
    return NextResponse.json({ ok: true, updated: changes.length });
  } catch (e) {
    await conn.run('ROLLBACK');
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
