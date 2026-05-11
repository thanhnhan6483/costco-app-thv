import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

/** POST /api/employees/bulk-set-field
 *  Body: { monthId, field, value }
 *  Update một cột cho toàn bộ nhân viên của tháng.
 */
const ALLOWED_FIELDS = ['ngay_nghi_cuoi_thang_truoc', 'so_ngay_lam_cuoi_thang_truoc', 'workdays', 'overtime_hours', 'late_minutes', 'phep_nam'];

export async function POST(req: NextRequest) {
  try {
    const { monthId, field, value } = await req.json();
    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: `Field '${field}' không được phép` }, { status: 400 });
    }
    const conn = await getConn();
    const result = await conn.all<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM employees WHERE month_id = ?`, monthId
    );
    const cnt = Number(result[0].cnt);
    await conn.run(
      `UPDATE employees SET ${field} = ? WHERE month_id = ?`, value, monthId
    );
    await conn.close();
    return NextResponse.json({ ok: true, updated: cnt, field, value, monthId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
