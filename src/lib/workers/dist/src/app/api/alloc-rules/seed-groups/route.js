"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const route_1 = require("../route");
exports.runtime = 'nodejs';
/**
 * SEED DATA — 4 nhóm quy tắc, đủ để chạy giải thuật Bảng Chấm Công.
 *
 * param_key  : khóa machine-readable để giải thuật lookup qua API
 * param_value: giá trị số (DOUBLE) — giải thuật đọc trực tiếp
 * default_param: mô tả văn bản hiển thị trong UI
 * specific_value (Ghi chú): ghi chú tự do
 */
const SEED = [
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
    {
        id: 'ot3', gc: 'OT_RULE', gn: 'Quy tắc tăng ca',
        name: 'Sai lệch giờ ra cho phép',
        paramKey: 'max_clockout_deviation_minutes', paramValue: 30,
        dp: 'Chênh lệch ≤ 30 phút',
        sv: 'Giờ ra thực tế có thể lệch tối đa 30 phút so với giờ ra chuẩn của ca (window_end).',
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
async function POST(req) {
    const conn = await (0, db_1.getConn)();
    try {
        const body = await req.json().catch(() => ({}));
        const mid = body.monthId || 'month_jan2026';
        const now = new Date().toISOString().slice(0, 10);
        // Migrate: thêm param_key/param_value nếu chưa có
        const cols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='alloc_rules'`);
        const colNames = cols.map(c => c.column_name);
        if (!colNames.includes('param_key')) {
            await conn.run(`ALTER TABLE alloc_rules ADD COLUMN param_key VARCHAR DEFAULT ''`);
        }
        if (!colNames.includes('param_value')) {
            await conn.run(`ALTER TABLE alloc_rules ADD COLUMN param_value DOUBLE DEFAULT NULL`);
        }
        await conn.run(`DELETE FROM alloc_rules WHERE month_id = ?`, mid);
        for (const r of SEED) {
            await conn.run(`INSERT INTO alloc_rules
           (id, month_id, group_code, group_name, name, param_key, param_value,
            default_param, specific_value, description, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', TRUE, ?)`, r.id, mid, (0, route_1.toDb)(r.gc), (0, route_1.toDb)(r.gn), (0, route_1.toDb)(r.name), r.paramKey, r.paramValue, (0, route_1.toDb)(r.dp), (0, route_1.toDb)(r.sv), now);
        }
        await conn.close();
        return server_1.NextResponse.json({ ok: true, count: SEED.length, monthId: mid });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
