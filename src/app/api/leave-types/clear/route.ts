import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/leave-types/clear
 * Body: { monthId: string }
 * Xóa tất cả loại nghỉ phép của tháng
 */
export async function POST(req: NextRequest) {
  try {
    const { monthId } = await req.json();
    if (!monthId) {
      return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
    }

    const conn = await getConn();
    
    // Xóa tất cả loại nghỉ phép của tháng
    await conn.run(`DELETE FROM leave_types WHERE month_id = ?`, monthId);
    
    await conn.close();
    
    return NextResponse.json({ ok: true, message: 'Đã xóa tất cả loại nghỉ phép' });
  } catch (e) {
    console.error('Error clearing leave types:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
