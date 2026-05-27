import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { monthId } = await req.json();
    if (!monthId) {
      return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
    }

    const conn = await getConn();
    
    // Xóa tất cả phòng ban của tháng
    await conn.run(`DELETE FROM departments WHERE month_id = ?`, monthId);
    
    await conn.close();
    
    return NextResponse.json({ ok: true, message: 'Đã xóa tất cả phòng ban' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
