/**
 * PUT    /api/months/[id]  – Cập nhật tháng
 * DELETE /api/months/[id]  – Xóa tháng + CASCADE toàn bộ cấu hình liên quan
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

/* ── PUT ──────────────────────────────────────── */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { label, fromDate, toDate, note } = await req.json();
    const conn = await getConn();
    await conn.run(
      `UPDATE months SET label=?, from_date=?, to_date=?, note=? WHERE id=?`,
      label ?? '', fromDate, toDate, note ?? '', id,
    );
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/months]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

/* ── DELETE ───────────────────────────────────── */
/* Cascade xóa toàn bộ cấu hình của tháng đó trong 1 transaction */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const conn = await getConn();
  try {
    const { id } = await params;

    // Không cho xóa tháng đã khóa (master)
    const [month] = await conn.all<{ locked: boolean }>(`SELECT locked FROM months WHERE id = ?`, id);
    if (month?.locked) {
      await conn.close();
      return NextResponse.json({ error: 'Không thể xóa tháng master (đã khóa)' }, { status: 403 });
    }

    await conn.run('BEGIN TRANSACTION');

    // Xóa tất cả dữ liệu cấu hình thuộc tháng này
    await conn.run(`DELETE FROM departments          WHERE month_id = ?`, id);
    await conn.run(`DELETE FROM shifts               WHERE month_id = ?`, id);
    await conn.run(`DELETE FROM leave_types          WHERE month_id = ?`, id);
    await conn.run(`DELETE FROM special_groups       WHERE month_id = ?`, id);
    await conn.run(`DELETE FROM alloc_rules          WHERE month_id = ?`, id);
    await conn.run(`DELETE FROM employees            WHERE month_id = ?`, id);
    await conn.run(`DELETE FROM distribution_results WHERE month_id = ?`, id);
    await conn.run(`DELETE FROM distribution_status  WHERE month_id = ?`, id);

    // Xóa bản ghi tháng
    await conn.run(`DELETE FROM months WHERE id = ?`, id);

    await conn.run('COMMIT');
    await conn.close();

    return NextResponse.json({
      ok: true,
      message: `Đã xóa tháng và toàn bộ cấu hình liên quan`,
    });
  } catch (e) {
    try { await conn.run('ROLLBACK'); } catch { /* ignore */ }
    await conn.close();
    console.error('[DELETE /api/months]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
