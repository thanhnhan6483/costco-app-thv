import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/invalidate-after
 * Body: { monthId, afterDisplayStep }
 *
 * Reset trạng thái "done" của tất cả bước CÓ displayStep > afterDisplayStep.
 *
 * Mapping display step → DB column:
 *   display 1 → step1_done
 *   display 2 → step2_done
 *   display 3 → step3_done
 *   display 4 → step4_done
 *   display 5 → step5_done
 *   display 6 → step6_done
 */

// Thứ tự display step → tên cột trong distribution_status
const STEP_ORDER: { displayNum: number; col: string }[] = [
  { displayNum: 1, col: 'step1_done' },
  { displayNum: 2, col: 'step2_done' },
  { displayNum: 3, col: 'step3_done' },
  { displayNum: 4, col: 'step4_done' },
  { displayNum: 5, col: 'step5_done' },
  { displayNum: 6, col: 'step6_done' },
];

export async function POST(req: NextRequest) {
  try {
    const { monthId, afterDisplayStep } = await req.json();
    if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

    // Lọc các bước cần reset (displayNum > afterDisplayStep)
    const colsToReset = STEP_ORDER
      .filter(s => s.displayNum > afterDisplayStep)
      .filter(s => !(s.displayNum === 6 && afterDisplayStep >= 5))
      .map(s => s.col);

    if (colsToReset.length === 0) {
      return NextResponse.json({ ok: true, reset: [] });
    }

    const conn = await getConn();

    // Kiểm tra bản ghi đã tồn tại chưa
    const exists = await conn.all<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM distribution_status WHERE month_id = ?`, monthId
    );

    if (Number(exists[0]?.cnt) > 0) {
      // SET từng cột = FALSE
      const setClauses = colsToReset.map(c => `${c} = FALSE`).join(', ');
      await conn.run(
        `UPDATE distribution_status SET ${setClauses}, updated_at = ? WHERE month_id = ?`,
        new Date().toISOString().slice(0, 19), monthId
      );

      // Xoá dữ liệu các bước phụ thuộc
      const dataClearCols: string[] = [];
      if (afterDisplayStep < 4) dataClearCols.push('ot_hours = 0', 'late_mins = 0');
      if (afterDisplayStep < 5) dataClearCols.push("check_in = ''", "check_out = ''");
      if (dataClearCols.length > 0) {
        await conn.run(
          `UPDATE distribution_results SET ${dataClearCols.join(', ')} WHERE month_id = ?`,
          monthId
        );
      }
    }

    await conn.close();
    return NextResponse.json({ ok: true, reset: colsToReset });
  } catch (e) {
    console.error('[POST /api/distribution/invalidate-after]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
