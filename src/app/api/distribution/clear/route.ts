import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
  const conn = await getConn();
  try {
    await conn.run(`DELETE FROM distribution_results WHERE month_id = ?`, monthId);
    await conn.run(`DELETE FROM distribution_status  WHERE month_id = ?`, monthId);
    await conn.close();
    return NextResponse.json({ ok: true, monthId });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
