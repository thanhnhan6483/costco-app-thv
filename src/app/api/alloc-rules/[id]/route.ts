import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { toDb } from '../route';
export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, defaultParam, specificValue, description, groupCode, groupName, paramKey } = await req.json();
    const conn = await getConn();
    await conn.run(
      `UPDATE alloc_rules SET name=?,param_key=?,default_param=?,specific_value=?,description=?,group_code=?,group_name=? WHERE id=?`,
      toDb(name), toDb(paramKey ?? ''), toDb(defaultParam ?? ''), toDb(specificValue ?? ''), toDb(description ?? ''),
      toDb(groupCode ?? 'WORK_RULE'), toDb(groupName ?? 'Quy tắc làm việc'), id
    );
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conn = await getConn();
    await conn.run(`UPDATE alloc_rules SET active = NOT active WHERE id=?`, id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conn = await getConn();
    await conn.run(`DELETE FROM alloc_rules WHERE id=?`, id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}
