import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

/**
 * SEED DATA — 4 nhóm quy tắc, đủ để chạy giải thuật Bảng Chấm Công.
 *
 * param_key  : khóa machine-readable để giải thuật lookup qua API
 * param_value: giá trị số (DOUBLE) — giải thuật đọc trực tiếp
 * default_param: mô tả văn bản hiển thị trong UI
 * specific_value (Ghi chú): ghi chú tự do
 */
const SEED: {
  id: string; gc: string; gn: string; name: string;
  paramKey: string; paramValue: number | null;
  dp: string; sv: string;
}[] = [
  /* ── WORK_RULE ──────────────────────────────────────────────────── */
  {
    id: 'wk1', gc: 'WORK_RULE', gn: 'Quy tắc làm việc',
    name: 'Giới hạn ngày làm liên tục',
    paramKey: 'max_consecutive_days', paramValue: 6,
    dp: '6 ngày',
    sv: 'Sau tối đa 6 ngày làm liên tiếp phải có ít nhất 1 ngày nghỉ. Dùng để kiểm tra constraint backtracking.',
  },
  {
    id: 'wk2', gc: 'WORK_RULE', gn: 'Quy tắc làm việc',
    name: 'Ngưỡng ngày công chọn giải thuật',
    paramKey: 'workdays_algorithm_threshold', paramValue: 27,
    dp: '27 ngày',
    sv: 'Nếu workdays < 27 → dùng generateOneArrangement; nếu ≥ 27 → random từ pool generateAllArrangements.',
  },
  {
    id: 'wk3', gc: 'WORK_RULE', gn: 'Quy tắc làm việc',
    name: 'Phép năm đặt từ ngày thứ',
    paramKey: 'pn_start_from_day', paramValue: 15,
    dp: 'Từ ngày 15',
    sv: 'Phép năm (PN) chỉ được xếp vào các ngày từ ngày thứ 15 của tháng trở đi (index >= 14).',
  },
  {
    id: 'wk4', gc: 'WORK_RULE', gn: 'Quy tắc làm việc',
    name: 'Vị trí phép năm ưu tiên',
    paramKey: 'pn_preferred_position', paramValue: null,
    dp: 'Cuối kỳ nghỉ',
    sv: 'PN được xếp vào ngày CUỐI của chuỗi LP (nghỉ lịch) liên tiếp DÀI NHẤT tính từ ngày pn_start_from_day trở đi. Nếu có nhiều chuỗi bằng nhau thì ưu tiên chuỗi xuất hiện cuối tháng. Nếu không có chuỗi LP nào từ ngày đó, lấy LP cuối cùng trong toàn tháng.',
  },

  /* ── SHIFT_BALANCING_RULE ───────────────────────────────────────── */
  {
    id: 'sb1', gc: 'SHIFT_BALANCING_RULE', gn: 'Quy tắc phân bổ ca',
    name: 'Chênh lệch ngày nghỉ tối đa giữa các NV',
    paramKey: 'max_day_off_difference', paramValue: 1,
    dp: 'Chênh lệch ±1 ngày',
    sv: 'Số ngày nghỉ giữa các nhân viên cùng phòng ban không được chênh lệch quá 1 ngày.',
  },
  {
    id: 'sb2', gc: 'SHIFT_BALANCING_RULE', gn: 'Quy tắc phân bổ ca',
    name: 'Chênh lệch nhân viên/ca/ngày',
    paramKey: 'max_shift_headcount_difference', paramValue: 1,
    dp: 'Chênh lệch ≤ 1 NV/ca/ngày',
    sv: 'Số nhân viên trên mỗi ca mỗi ngày không được chênh lệch quá 1 người so với ca khác.',
  },

  /* ── OT_RULE ────────────────────────────────────────────────────── */
  {
    id: 'ot1', gc: 'OT_RULE', gn: 'Quy tắc tăng ca',
    name: 'Tăng ca tối đa mỗi ngày',
    paramKey: 'max_ot_per_day_hours', paramValue: 4,
    dp: '4 giờ/ngày',
    sv: 'Mỗi ngày làm việc chỉ được phân bổ tối đa 4 giờ tăng ca. Giải thuật random(1..4).',
  },
  {
    id: 'ot2', gc: 'OT_RULE', gn: 'Quy tắc tăng ca',
    name: 'Phân bổ tăng ca từ ngày thứ',
    paramKey: 'ot_distribution_start_day', paramValue: 15,
    dp: 'Từ ngày 15',
    sv: 'Giờ tăng ca chỉ được phân bổ vào các ngày từ ngày thứ 15 của tháng trở đi (index >= 14).',
  },
  /* ── ATTENDANCE_RULE ────────────────────────────────────────────── */
  {
    id: 'at1', gc: 'ATTENDANCE_RULE', gn: 'Quy tắc chấm công',
    name: 'Đi trễ tối đa mỗi ngày',
    paramKey: 'max_late_per_day_minutes', paramValue: 14,
    dp: '14 phút/ngày',
    sv: 'Mỗi ngày làm việc chỉ được phân bổ tối đa 14 phút đi trễ. Giải thuật random(1..14). Giờ vào = chuẩn + trễ + 15 phút buffer.',
  },
  {
    id: 'at2', gc: 'ATTENDANCE_RULE', gn: 'Quy tắc chấm công',
    name: 'Phân bổ đi trễ từ ngày thứ',
    paramKey: 'late_distribution_start_day', paramValue: 15,
    dp: 'Từ ngày 15',
    sv: 'Phút đi trễ chỉ được phân bổ vào các ngày từ ngày thứ 15 của tháng trở đi (index >= 14).',
  },
  {
    id: 'at3', gc: 'ATTENDANCE_RULE', gn: 'Quy tắc chấm công',
    name: 'Nhóm đặc thù — giảm giờ làm',
    paramKey: 'special_group_work_hour_reduction', paramValue: 1,
    dp: 'Giảm 1 giờ/ngày',
    sv: 'Nhân viên thuộc nhóm đặc thù (dưới 18 tuổi / có thai / nuôi con nhỏ): giờ ra sớm hơn 1 tiếng so với ca bình thường.',
  },
];

export async function POST(req: NextRequest) {
  const conn = await getConn();
  try {
    const body = await req.json().catch(() => ({}));
    const mid = (body as { monthId?: string }).monthId || DEFAULT_MONTH_ID;
    const now = new Date().toISOString().slice(0, 10);

    // Migrate: thêm param_key/param_value nếu chưa có
    const cols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='alloc_rules'`
    );
    const colNames = cols.map(c => c.column_name);
    if (!colNames.includes('param_key')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN param_key VARCHAR DEFAULT ''`);
    }
    if (!colNames.includes('param_value')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN param_value DOUBLE DEFAULT NULL`);
    }

    await conn.run(`DELETE FROM alloc_rules WHERE month_id = ?`, mid);

    for (const r of SEED) {
      await conn.run(
        `INSERT INTO alloc_rules
           (id, month_id, group_code, group_name, name, param_key, param_value,
            default_param, specific_value, description, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', TRUE, ?)`,
        r.id, mid,
        r.gc, r.gn, r.name,
        r.paramKey, r.paramValue,
        r.dp, r.sv,
        now,
      );
    }

    await conn.close();
    return NextResponse.json({ ok: true, count: SEED.length, monthId: mid });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
