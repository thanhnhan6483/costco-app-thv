import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

const RULES = [
  { id: '1', groupCode: 'WORK_RULE',            groupName: 'Quy tắc làm việc',   name: 'Giới hạn ngày làm liên tục',         paramKey: 'max_consecutive_days',           paramValue: 6,    defaultParam: '6 ngày',              description: 'Sau tối đa 6 Giới hạn ngày làm liên tục phải có ít nhất 1 ngày nghỉ.' },
  { id: '2', groupCode: 'WORK_RULE',            groupName: 'Quy tắc làm việc',   name: 'Khoảng cách ngày nghỉ liên tháng',   paramKey: 'max_consecutive_days',           paramValue: 6,    defaultParam: '≤ 6 ngày',            description: 'Khoảng cách giữa ngày nghỉ cuối tháng trước và ngày nghỉ đầu tháng hiện tại không vượt quá 6 ngày làm.' },
  { id: '3', groupCode: 'WORK_RULE',            groupName: 'Quy tắc làm việc',   name: 'Phân bổ ngày nghỉ đồng đều',         paramKey: 'max_day_off_difference',         paramValue: 1,    defaultParam: '±1 ngày',             description: 'Số ngày nghỉ của các nhân viên trong cùng phòng ban được phân bổ đều. Chênh lệch tối đa: ±1 ngày.' },
  { id: '3b', groupCode: 'WORK_RULE',           groupName: 'Quy tắc làm việc',   name: 'Phòng ban bỏ qua cân bằng nghỉ',     paramKey: 'skip_equal_rest_dept_codes',     paramValue: null, defaultParam: 'BGD',                 specificValue: 'BGD', description: 'Danh sách mã phòng ban KHÔNG áp dụng cân bằng ngày nghỉ, cách nhau bởi dấu phẩy. VD: BGD,KD' },
  { id: '4', groupCode: 'WORK_RULE',            groupName: 'Quy tắc làm việc',   name: 'Vị trí phép năm (PN)',               paramKey: 'pn_start_from_day',              paramValue: 15,   defaultParam: 'Từ ngày 15',          description: 'PN được xếp vào ngày CUỐI của chuỗi LP liên tiếp DÀI NHẤT tính từ ngày 15 trở đi.' },
  { id: '5', groupCode: 'SHIFT_BALANCING_RULE', groupName: 'Quy tắc phân bổ ca', name: 'Phân bổ ca cân bằng',               paramKey: 'max_shift_difference',            paramValue: 1,    defaultParam: 'Chênh lệch ≤ 1 NV',  description: 'Số lượng nhân viên giữa các ca trong cùng phòng ban phải gần bằng nhau mỗi ngày.' },
  { id: '6', groupCode: 'ATTENDANCE_RULE',      groupName: 'Quy tắc chấm công',  name: 'Đi trễ tối đa/ngày',                paramKey: 'max_late_per_day_minutes',       paramValue: 9,    defaultParam: '9 phút/ngày',         description: 'Không có ngày nào có số phút trễ > 9 phút.' },
  { id: '7', groupCode: 'OT_RULE',              groupName: 'Quy tắc tăng ca',    name: 'Tăng ca tối thiểu/ngày',            paramKey: 'min_ot_per_day_minutes',         paramValue: 60,   defaultParam: '60 phút/ngày',        description: 'Nếu có tăng ca, số phút OT trong ngày phải ≥ 60 phút. Đặt 0 để tắt.' },
  { id: '8', groupCode: 'OT_RULE',              groupName: 'Quy tắc tăng ca',    name: 'OT cân bằng trong phòng ban',       paramKey: 'max_ot_balance_diff_minutes',    paramValue: 30,   defaultParam: 'Chênh lệch ≤ 30 phút', description: 'Nhân viên cùng phòng ban có số giờ OT trong cùng ngày gần bằng nhau. Chênh lệch tối đa (phút).' },
  { id: '9', groupCode: 'OT_RULE',              groupName: 'Quy tắc tăng ca',    name: 'Tăng ca tối đa giữa hai ngày nghỉ', paramKey: 'max_ot_between_rest_hours',      paramValue: 12,   defaultParam: '12 giờ',              description: 'Tổng OT trong khoảng giữa hai ngày nghỉ liên tiếp không vượt N tiếng.' },
  { id: '10', groupCode: 'WORK_RULE',           groupName: 'Quy tắc làm việc',   name: 'Vị trí phép năm ưu tiên',           paramKey: 'pn_preferred_position',          paramValue: null, defaultParam: 'Cuối kỳ nghỉ',       description: 'PN được xếp vào ngày CUỐI của chuỗi LP liên tiếp DÀI NHẤT tính từ ngày 15 trở đi.' },
];

/* GET /api/alloc-rules/seed?month=xxx — xóa và seed lại quy tắc mặc định (giá trị tháng 4/2026) */
export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
  try {
    const conn = await getConn();
    try { await conn.run(`ALTER TABLE alloc_rules ADD COLUMN default_param VARCHAR DEFAULT ''`); } catch { /* exists */ }
    await conn.run(`DELETE FROM alloc_rules WHERE month_id = ?`, monthId);
    const today = new Date().toISOString().slice(0, 10);
    for (const r of RULES) {
      await conn.run(
        `INSERT INTO alloc_rules (id, month_id, group_code, group_name, name, param_key, param_value, default_param, specific_value, description, active, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,TRUE,?)`,
        `${r.id}_${monthId}`, monthId, r.groupCode, r.groupName, r.name, r.paramKey, r.paramValue ?? null, r.defaultParam, (r as any).specificValue ?? '', r.description, today,
      );
    }
    await conn.close();
    return NextResponse.json({ ok: true, seeded: RULES.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
