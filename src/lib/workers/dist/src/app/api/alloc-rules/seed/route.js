"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
const RULES = [
    { id: '1', name: 'Giới hạn ngày làm liên tục', defaultParam: '6 ngày', description: 'Sau tối đa 6 ngày làm liên tiếp phải có ít nhất 1 ngày nghỉ.' },
    { id: '2', name: 'Khoảng cách ngày nghỉ liên tháng', defaultParam: '≤ 6 ngày', description: 'Khoảng cách giữa ngày nghỉ cuối tháng trước và ngày nghỉ đầu tháng hiện tại không vượt quá 6 ngày làm.' },
    { id: '3', name: 'Phân bổ ngày nghỉ đồng đều', defaultParam: 'Áp dụng cho mọi phòng ban trừ Ban Giám đốc', description: 'Số ngày nghỉ của các nhân viên trong cùng phòng ban được phân bổ đều. Chênh lệch tối đa: ±1 ngày.' },
    { id: '4', name: 'Vị trí phép năm (PN)', defaultParam: 'Cuối kỳ nghỉ', description: 'PN được xếp vào ngày CUỐI của chuỗi LP liên tiếp DÀI NHẤT tính từ ngày 15 trở đi. Nếu nhiều chuỗi bằng nhau thì ưu tiên chuỗi gần cuối tháng hơn.' },
    { id: '5', name: 'Phân bổ ca cân bằng', defaultParam: 'Chênh lệch ≤ 1 NV/ca/ngày', description: 'Số lượng nhân viên giữa các ca trong cùng phòng ban phải gần bằng nhau mỗi ngày.' },
    { id: '6', name: 'Đi trễ tối đa/ngày', defaultParam: '9 phút/ngày', description: 'Không có ngày nào có số phút trễ > 9 phút.' },
    { id: '7', name: 'Tăng ca tối thiểu/ngày', defaultParam: '60 phút/ngày', description: 'Nếu có tăng ca, số phút OT trong ngày phải ≥ 60 phút.' },
    { id: '8', name: 'OT cân bằng trong phòng ban', defaultParam: 'Chênh lệch ≤ 30 phút/ngày', description: 'Nhân viên cùng phòng ban có số giờ OT trong cùng ngày gần bằng nhau.' },
    { id: '9', name: 'OT tối đa giữa hai ngày nghỉ tour', defaultParam: '12 giờ', description: 'Tổng OT trong khoảng giữa hai ngày nghỉ liên tiếp không vượt 12 tiếng.' },
];
/* GET /api/alloc-rules/seed — xóa và seed lại 9 quy tắc mặc định với UTF-8 chuẩn */
async function GET() {
    try {
        const conn = await (0, db_1.getConn)();
        // Đảm bảo cột default_param tồn tại
        try {
            await conn.run(`ALTER TABLE alloc_rules ADD COLUMN default_param VARCHAR DEFAULT ''`);
        }
        catch { /* exists */ }
        // Xóa toàn bộ dữ liệu cũ bị lỗi encoding
        await conn.run(`DELETE FROM alloc_rules`);
        // Insert lại với UTF-8 đúng
        const today = new Date().toISOString().slice(0, 10);
        for (const r of RULES) {
            await conn.run(`INSERT INTO alloc_rules (id, name, default_param, description, active, created_at) VALUES (?,?,?,?,TRUE,?)`, r.id, r.name, r.defaultParam, r.description, today);
        }
        await conn.close();
        return server_1.NextResponse.json({ ok: true, seeded: RULES.length });
    }
    catch (e) {
        console.error(e);
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
