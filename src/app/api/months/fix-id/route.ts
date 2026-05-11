/**
 * POST /api/months/fix-id
 * Cập nhật ID tháng cũ (timestamp) thành ID chuẩn 'month_jan2026'
 * để khớp với dữ liệu departments/shifts/employees đã migrate.
 *
 * Chạy 1 lần: POST http://localhost:3000/api/months/fix-id
 */
import { NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const conn = await getConn();

    // Tìm tháng 01/2026 có ID khác month_jan2026
    const rows = await conn.all(
      `SELECT id FROM months WHERE month = '01/2026' AND id != 'month_jan2026'`
    );

    if (rows.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, message: 'Không cần fix – tháng 01/2026 đã có ID đúng' });
    }

    const oldId = (rows[0] as { id: string }).id;

    // Cập nhật ID trong bảng months
    await conn.run(
      `UPDATE months SET id = 'month_jan2026' WHERE id = ?`, oldId
    );

    await conn.close();
    return NextResponse.json({
      ok: true,
      message: `Đã cập nhật ID tháng 01/2026 từ '${oldId}' → 'month_jan2026'`,
    });
  } catch (e) {
    console.error('[POST /api/months/fix-id]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
