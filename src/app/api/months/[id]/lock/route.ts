import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { locked } = await req.json() as { locked: boolean };
  const conn = await getConn();
  try {
    await conn.run(`UPDATE months SET locked = ? WHERE id = ?`, locked, id);
    try { await conn.close(); } catch { /* ignore */ }
    return NextResponse.json({ ok: true, locked });
  } catch (e) {
    try { await conn.close(); } catch { /* ignore */ }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
