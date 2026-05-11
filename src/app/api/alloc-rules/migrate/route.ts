import { NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

/* GET /api/alloc-rules/migrate  — chạy một lần để thêm cột default_param */
export async function GET() {
  try {
    const conn = await getConn();
    // Thêm cột nếu chưa có
    try {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN default_param VARCHAR DEFAULT ''`);
    } catch {
      // Cột đã tồn tại — bỏ qua
    }
    // Cập nhật dữ liệu mặc định cho 9 quy tắc
    const defaults: Record<string, string> = {
      '1': '6 ngày',
      '2': '≤ 6 ngày',
      '3': 'Áp dụng cho mọi phòng ban trừ Ban Giám đốc',
      '4': 'Cuối kỳ nghỉ',
      '5': 'Chênh lệch ≤ 1 NV/ca/ngày',
      '6': '9 phút/ngày',
      '7': '60 phút/ngày',
      '8': 'Chênh lệch ≤ 30 phút/ngày',
      '9': '12 giờ',
    };
    for (const [id, param] of Object.entries(defaults)) {
      await conn.run(`UPDATE alloc_rules SET default_param = ? WHERE id = ? AND (default_param IS NULL OR default_param = '')`, param, id);
    }
    await conn.close();
    return NextResponse.json({ ok: true, message: 'Migration thành công' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
