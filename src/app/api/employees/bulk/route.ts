import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

/* PATCH /api/employees/bulk
   Body: { ids: string[], monthId?: string, departmentId?: string, specialGroup?: string, groupCodeEndDate?: string }
   Chỉ cập nhật các field được truyền vào (không null/undefined)
*/
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, departmentId, maPb, specialGroup, groupCodeEndDate } = body as {
      ids: string[];
      monthId?: string;
      departmentId?: string;
      maPb?: string;
      specialGroup?: string;
      groupCodeEndDate?: string;
    };

    if (!ids || ids.length === 0)
      return NextResponse.json({ error: 'Không có dòng nào được chọn' }, { status: 400 });

    const conn = await getConn();
    const placeholders = ids.map(() => '?').join(', ');

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (departmentId !== undefined) { setClauses.push('department_id = ?'); values.push(departmentId); }
    if (maPb !== undefined)         { setClauses.push('ma_pb = ?');          values.push(maPb); }
    if (specialGroup !== undefined) { setClauses.push('special_group = ?');  values.push(specialGroup); }
    if (groupCodeEndDate !== undefined) { setClauses.push('group_code_end_date = ?'); values.push(groupCodeEndDate); }

    if (setClauses.length === 0)
      return NextResponse.json({ error: 'Không có trường nào cần cập nhật' }, { status: 400 });

    await conn.run(
      `UPDATE employees SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`,
      ...values, ...ids,
    );

    await conn.close();
    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (e) {
    console.error('[PATCH /api/employees/bulk]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
