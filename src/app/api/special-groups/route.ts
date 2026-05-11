/**
 * GET  /api/special-groups?month=<monthId>
 * POST /api/special-groups  (body chứa monthId)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    const rows = await conn.all(
      `SELECT id, month_id AS monthId, code, name, work_hours AS workHours, note, created_at AS createdAt
       FROM special_groups WHERE month_id = ? ORDER BY code`, monthId
    );
    await conn.close();
    return NextResponse.json(rows);
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const { id, code, name, workHours, note, createdAt, monthId } = await req.json();
    const mid = monthId ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    await conn.run(
      `INSERT INTO special_groups (id,month_id,code,name,work_hours,note,created_at) VALUES (?,?,?,?,?,?,?)`,
      id, mid, code.toUpperCase(), name, workHours ?? 8.0, note ?? '', createdAt
    );
    await conn.close();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Mã nhóm đã tồn tại' }, { status: 409 });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
