import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const { monthId } = await req.json();
    const mid = monthId ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    await conn.run('DELETE FROM alloc_rules WHERE month_id = ?', mid);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
