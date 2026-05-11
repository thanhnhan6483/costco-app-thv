/**
 * POST /api/employees/relink?month=<monthId>
 * Re-link employees với departments dựa trên ma_pb (trong cùng tháng)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
    const conn = await getConn();

    // Lấy departments của tháng này
    const depts = await conn.all<{ id: string; code: string }>(
      `SELECT id, code FROM departments WHERE month_id = ?`, monthId
    );
    const deptMap: Record<string, string> = {};
    depts.forEach(d => { deptMap[d.code.toUpperCase()] = d.id; });

    // Lấy employees của tháng này chưa link
    const emps = await conn.all<{ id: string; code: string; ma_pb: string }>(
      `SELECT id, code, ma_pb FROM employees
       WHERE month_id = ? AND (department_id = '' OR department_id IS NULL) AND ma_pb <> ''`,
      monthId
    );

    let linked = 0;
    const notFound: string[] = [];

    for (const e of emps) {
      const deptId = deptMap[e.ma_pb.toUpperCase()];
      if (deptId) {
        await conn.run(`UPDATE employees SET department_id=? WHERE id=?`, deptId, e.id);
        linked++;
      } else {
        notFound.push(e.ma_pb);
      }
    }

    await conn.close();
    return NextResponse.json({
      ok: true,
      linked,
      notFound: [...new Set(notFound)],
      totalChecked: emps.length,
    });
  } catch (e) {
    console.error('[POST /api/employees/relink]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
