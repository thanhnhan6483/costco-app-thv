import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

function fixRow(r: Record<string, unknown>) {
  return {
    id:            String(r.id ?? ''),
    monthId:       String(r.monthId ?? ''),
    groupCode:     String(r.groupCode ?? ''),
    groupName:     String(r.groupName ?? ''),
    name:          String(r.name ?? ''),
    paramKey:      String(r.paramKey ?? ''),
    paramValue:    r.paramValue != null ? Number(r.paramValue) : null,
    defaultParam:  String(r.defaultParam ?? ''),
    specificValue: String(r.specificValue ?? ''),
    description:   String(r.description ?? ''),
    active:        Boolean(r.active),
    createdAt:     String(r.createdAt ?? ''),
  };
}

export async function GET(req: NextRequest) {
  try {
    const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    const rows = await conn.all(
      `SELECT id, month_id AS monthId, group_code AS groupCode, group_name AS groupName,
              name, param_key AS paramKey, param_value AS paramValue,
              default_param AS defaultParam, specific_value AS specificValue,
              description, active, created_at AS createdAt
       FROM alloc_rules WHERE month_id = ?
       ORDER BY group_code, created_at, id`, monthId
    ) as Record<string, unknown>[];
    await conn.close();
    return NextResponse.json(rows.map(fixRow));
  } catch (e) {
    console.error('[GET /api/alloc-rules]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const paramKey = req.nextUrl.searchParams.get('paramKey');
    if (!paramKey) return NextResponse.json({ error: 'Thiếu paramKey' }, { status: 400 });
    const conn = await getConn();
    await conn.run(`DELETE FROM alloc_rules WHERE param_key = ?`, paramKey);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, name, defaultParam, specificValue, description, createdAt, monthId, groupCode, groupName, paramKey, paramValue } = await req.json();
    const mid = monthId ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    await conn.run(
      `INSERT INTO alloc_rules (id,month_id,group_code,group_name,name,param_key,param_value,default_param,specific_value,description,active,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,TRUE,?)`,
      id, mid,
      groupCode ?? 'WORK_RULE', groupName ?? 'Quy tắc làm việc',
      name, paramKey ?? '', paramValue ?? null,
      defaultParam ?? '', specificValue ?? '', description ?? '',
      createdAt,
    );
    await conn.close();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/alloc-rules]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
