/**
 * GET  /api/departments?month=<monthId>   – Lấy danh sách phòng ban theo tháng
 * POST /api/departments                    – Tạo phòng ban mới (body chứa monthId)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    const rows = await conn.all(`
      SELECT d.id, d.month_id AS monthId, d.code, d.name, d.parent_id AS parentId,
             p.name AS parentName,
             d.active, d.note, d.created_at AS createdAt
      FROM departments d
      LEFT JOIN departments p ON p.id = d.parent_id AND p.month_id = d.month_id
      WHERE d.month_id = ?
      ORDER BY d.code
    `, monthId);
    await conn.close();
    return NextResponse.json(rows);
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const { id, code, name, parentId, note, createdAt, monthId } = await req.json();
    const mid = monthId ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    await conn.run(
      `INSERT INTO departments (id, month_id, code, name, parent_id, active, note, created_at) VALUES (?,?,?,?,?,TRUE,?,?)`,
      id, mid, code.toUpperCase(), name, parentId ?? null, note ?? '', createdAt
    );
    await conn.close();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Mã phòng ban đã tồn tại trong tháng này' }, { status: 409 });
    console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
