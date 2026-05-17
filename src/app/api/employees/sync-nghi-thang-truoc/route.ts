import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

function calcPrevMonth(monthLabel: string) {
  const [mm, yyyy] = monthLabel.split('/').map(Number);
  const prevMm = mm === 1 ? 12 : mm - 1;
  const prevYyyy = mm === 1 ? yyyy - 1 : yyyy;
  return { prevMm, prevYyyy, prevMonthLabel: `${String(prevMm).padStart(2, '0')}/${prevYyyy}` };
}

/** GET: trả về thông tin tháng trước để hiện confirm */
export async function GET(req: NextRequest) {
  try {
    const monthId = req.nextUrl.searchParams.get('month');
    if (!monthId) return NextResponse.json({ error: 'Thiếu month' }, { status: 400 });
    const conn = await getConn();
    const monthRows = await conn.all<{ month: string; label: string }>(
      `SELECT month, label FROM months WHERE id = ?`, monthId
    );
    if (!monthRows.length) { await conn.close(); return NextResponse.json({ error: 'Không tìm thấy tháng' }, { status: 404 }); }
    const { prevMonthLabel } = calcPrevMonth(monthRows[0].month);
    const prevRows = await conn.all<{ id: string; label: string }>(
      `SELECT id, label FROM months WHERE month = ?`, prevMonthLabel
    );
    await conn.close();
    if (!prevRows.length) return NextResponse.json({ found: false, prevMonthLabel });
    return NextResponse.json({ found: true, prevMonthLabel, prevMonthLabel2: prevRows[0].label, currentLabel: monthRows[0].label });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { monthId } = await req.json();
    if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

    const conn = await getConn();

    const monthRows = await conn.all<{ month: string }>(
      `SELECT month FROM months WHERE id = ?`, monthId
    );
    if (!monthRows.length) { await conn.close(); return NextResponse.json({ error: 'Không tìm thấy tháng' }, { status: 404 }); }

    const { prevMm, prevYyyy, prevMonthLabel } = calcPrevMonth(monthRows[0].month);

    // 3. Tìm prevMonthId
    const prevMonthRows = await conn.all<{ id: string }>(
      `SELECT id FROM months WHERE month = ?`, prevMonthLabel
    );
    if (!prevMonthRows.length) {
      await conn.close();
      return NextResponse.json({ synced: 0, message: `Không có dữ liệu tháng ${prevMonthLabel}` });
    }
    const prevMonthId = prevMonthRows[0].id;

    // 4. Kiểm tra bước 6 tháng trước đã hoàn thành chưa
    const statusRows = await conn.all<{ step6_done: boolean }>(
      `SELECT step6_done FROM distribution_status WHERE month_id = ?`, prevMonthId
    );
    if (!statusRows.length || !statusRows[0].step6_done) {
      await conn.close();
      return NextResponse.json({ synced: 0, message: `Tháng ${prevMonthLabel} chưa hoàn thành Bước 6` });
    }

    // 5. Lấy ngày nghỉ cuối tháng của từng NV trong tháng trước
    //    day_type <> 0 = nghỉ; lấy MAX(day) theo employee code
    const restDays = await conn.all<{ code: string; last_rest_day: number }>(
      `SELECT e.code, MAX(dr.day) AS last_rest_day
       FROM distribution_results dr
       JOIN employees e ON e.id = dr.employee_id AND e.month_id = dr.month_id
       WHERE dr.month_id = ?
         AND dr.day_type >= 0
         AND dr.day_type <> 0
       GROUP BY e.code`,
      prevMonthId
    );

    if (!restDays.length) {
      await conn.close();
      return NextResponse.json({ synced: 0, message: 'Không có dữ liệu nghỉ trong tháng trước' });
    }

    // 6. Bulk UPDATE employees tháng hiện tại
    let synced = 0;
    for (const { code, last_rest_day } of restDays) {
      const day = String(last_rest_day).padStart(2, '0');
      const formatted = `${day}/${String(prevMm).padStart(2, '0')}/${prevYyyy}`;
      const existing = await conn.all<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM employees WHERE month_id = ? AND code = ?`,
        monthId, code
      );
      if (Number(existing[0]?.cnt) > 0) {
        await conn.run(
          `UPDATE employees SET ngay_nghi_cuoi_thang_truoc = ? WHERE month_id = ? AND code = ?`,
          formatted, monthId, code
        );
        synced++;
      }
    }

    await conn.close();
    return NextResponse.json({ synced, prevMonth: prevMonthLabel });
  } catch (e) {
    console.error('[POST /api/employees/sync-nghi-thang-truoc]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
