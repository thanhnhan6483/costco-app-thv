import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json().catch(() => ({}));
  const mid = monthId ?? DEFAULT_MONTH_ID;
  const conn = await getConn();
  try {
    await conn.run(`DELETE FROM alloc_rules WHERE param_key = ? AND month_id = ?`, 'skip_equal_rest_dept_codes', mid);
    await conn.run(
      `INSERT INTO alloc_rules
         (id, month_id, group_code, group_name, name, param_key, param_value,
          default_param, specific_value, description, active, created_at)
       VALUES (?,?,?,?,?,?,NULL,?,?,?,TRUE,?)`,
      `rule_skip_equal_rest_${mid}`, mid,
      'WORK_RULE', 'Quy tắc làm việc', 'Phòng ban không phân bổ đồng đều LP',
      'skip_equal_rest_dept_codes', 'BGD', 'BGD', '',
      new Date().toISOString().slice(0, 10),
    );
    await conn.close();
    return NextResponse.json({ ok: true, monthId: mid });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
