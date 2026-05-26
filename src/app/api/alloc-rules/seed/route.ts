import { NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
export const runtime = 'nodejs';

const RULES = [
  { id: '1', groupCode: 'WORK_RULE',            groupName: 'Quy tắc làm việc',   name: 'Giới hạn ngày làm liên tục',         paramKey: 'max_consecutive_days',           paramValue: 6,    defaultParam: '6 ngày',              description: 'Sau tối đa 6 ngày làm liên tiếp phải có ít nhất 1 ngày nghỉ.' },
  { id: '2', groupCode: 'WORK_RULE',            groupName: 'Quy tắc làm việc',   name: 'Khoảng cách ngày nghỉ liên tháng',   paramKey: 'max_consecutive_days',           paramValue: 6,    defaultParam: '≤ 6 ngày',            description: 'Khoảng cách giữa ngày nghỉ cuối tháng trước và ngày nghỉ đầu tháng hiện tại không vượt quá 6 ngày làm.' },
  { id: '3', groupCode: 'WORK_RULE',            groupName: 'Quy tắc làm việc',   name: 'Phân bổ ngày nghỉ đồng đều',         paramKey: 'max_day_off_difference',         paramValue: 1,    defaultParam: '±1 ngày',             description: 'Số ngày nghỉ của các nhân viên trong cùng phòng ban được phân bổ đều. Chênh lệch tối đa: ±1 ngày.' },
  { id: '4', groupCode: 'WORK_RULE',            groupName: 'Quy tắc làm việc',   name: 'Vị trí phép năm (PN)',               paramKey: 'pn_start_from_day',              paramValue: 15,   defaultParam: 'Từ ngày 15',          description: 'PN được xếp vào ngày CUỐI của chuỗi LP liên tiếp DÀI NHẤT tính từ ngày 15 trở đi.' },
  { id: '5', groupCode: 'SHIFT_BALANCING_RULE', groupName: 'Quy tắc phân bổ ca', name: 'Phân bổ ca cân bằng',               paramKey: 'max_day_off_difference',         paramValue: 1,    defaultParam: 'Chênh lệch ≤ 1 NV',  description: 'Số lượng nhân viên giữa các ca trong cùng phòng ban phải gần bằng nhau mỗi ngày.' },
  { id: '6', groupCode: 'ATTENDANCE_RULE',      groupName: 'Quy tắc chấm công',  name: 'Đi trễ tối đa/ngày',                paramKey: 'max_late_per_day_minutes',       paramValue: 14,   defaultParam: '14 phút/ngày',        description: 'Không có ngày nào có số phút trễ > 14 phút.' },
  { id: '7', groupCode: 'OT_RULE',              groupName: 'Quy tắc tăng ca',    name: 'Tăng ca tối đa/ngày',               paramKey: 'max_ot_per_day_hours',           paramValue: 4,    defaultParam: '4 giờ/ngày',          description: 'Nếu có tăng ca, số giờ OT trong ngày không vượt quá 4 giờ.' },
  { id: '8', groupCode: 'OT_RULE',              groupName: 'Quy tắc tăng ca',    name: 'Ngày bắt đầu phân bổ OT',           paramKey: 'ot_distribution_start_day',      paramValue: 15,   defaultParam: 'Từ ngày 15',          description: 'OT chỉ được phân bổ từ ngày 15 trở đi trong tháng.' },
  { id: '9', groupCode: 'OT_RULE',              groupName: 'Quy tắc tăng ca',    name: 'Ngày bắt đầu phân bổ trễ',          paramKey: 'late_distribution_start_day',    paramValue: 15,   defaultParam: 'Từ ngày 15',          description: 'Phút trễ chỉ được phân bổ từ ngày 15 trở đi trong tháng.' },
];

/* GET /api/alloc-rules/seed — xóa và seed lại 9 quy tắc mặc định với UTF-8 chuẩn */
export async function GET() {
  try {
    const conn = await getConn();
    // Đảm bảo cột default_param tồn tại
    try { await conn.run(`ALTER TABLE alloc_rules ADD COLUMN default_param VARCHAR DEFAULT ''`); } catch { /* exists */ }
    // Xóa toàn bộ dữ liệu cũ bị lỗi encoding
    await conn.run(`DELETE FROM alloc_rules`);
    // Insert lại với UTF-8 đúng
    const today = new Date().toISOString().slice(0, 10);
    for (const r of RULES) {
      await conn.run(
        `INSERT INTO alloc_rules (id, month_id, group_code, group_name, name, param_key, param_value, default_param, description, active, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,TRUE,?)`,
        r.id, DEFAULT_MONTH_ID, r.groupCode, r.groupName, r.name, r.paramKey, r.paramValue, r.defaultParam, r.description, today,
      );
    }
    await conn.close();
    return NextResponse.json({ ok: true, seeded: RULES.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
