/**
 * GET  /api/leave-types?month=<monthId>
 * POST /api/leave-types  (body chứa monthId)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    let rows;
    try {
      rows = await conn.all(
        `SELECT id, month_id AS monthId, code, name, description, paid, note, COALESCE(day_type, -1) AS dayType, created_at AS createdAt
         FROM leave_types WHERE month_id = ? ORDER BY code`, monthId
      );
    } catch {
      // Fallback nếu cột day_type chưa tồn tại
      rows = await conn.all(
        `SELECT id, month_id AS monthId, code, name, description, paid, note, -1 AS dayType, created_at AS createdAt
         FROM leave_types WHERE month_id = ? ORDER BY code`, monthId
      );
    }
    await conn.close();
    return NextResponse.json(rows);
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const { id, code, name, description, paid, note, dayType, createdAt, monthId } = await req.json();
    const mid = monthId ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    await conn.run(
      `INSERT INTO leave_types (id,month_id,code,name,description,paid,note,day_type,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      id, mid, code.toUpperCase(), name, description??'', paid??true, note??'', dayType??-1, createdAt
    );
    await conn.close();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Mã loại nghỉ đã tồn tại' }, { status: 409 });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
