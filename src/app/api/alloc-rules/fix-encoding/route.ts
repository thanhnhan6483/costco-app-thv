import { NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

function fromDb(v: unknown): string {
  if (v == null) return '';
  try { return Buffer.from(String(v), 'latin1').toString('utf8'); } catch { return String(v); }
}

/** Chạy 1 lần: decode latin1 → utf8 cho toàn bộ alloc_rules */
export async function POST() {
  const conn = await getConn();
  try {
    const rows = await conn.all<{
      id: string; group_code: string; group_name: string;
      name: string; default_param: string; specific_value: string; description: string;
    }>(`SELECT id, group_code, group_name, name, default_param, specific_value, description FROM alloc_rules`);

    let updated = 0;
    for (const r of rows) {
      await conn.run(
        `UPDATE alloc_rules SET group_code=?, group_name=?, name=?, default_param=?, specific_value=?, description=? WHERE id=?`,
        fromDb(r.group_code), fromDb(r.group_name), fromDb(r.name),
        fromDb(r.default_param), fromDb(r.specific_value), fromDb(r.description),
        r.id
      );
      updated++;
    }
    await conn.close();
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
