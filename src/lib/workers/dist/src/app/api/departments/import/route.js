"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
/**
 * GET  /api/departments/template  – Tải file Excel mẫu
 * POST /api/departments/import    – Import từ file Excel
 */
const server_1 = require("next/server");
const XLSX = __importStar(require("xlsx"));
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
/* ── Cấu trúc cột Excel ─────────────────────── */
const HEADERS = ['Mã PB', 'Tên Phòng Ban', 'Phòng Ban Cấp Trên', 'Ghi Chú'];
const SAMPLE_ROWS = [
    ['KD', 'Kinh Doanh', '', ''],
    ['SX', 'Sản Xuất', '', 'Khối sản xuất chính'],
    ['KHO', 'Kho Hàng', 'SX', 'Thuộc Sản Xuất'],
];
/* ── GET: Tải file mẫu ──────────────────────── */
async function GET() {
    const wb = XLSX.utils.book_new();
    // Sheet chính
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS]);
    // Style header (column widths)
    ws['!cols'] = [
        { wch: 12 }, // Mã PB
        { wch: 30 }, // Tên Phòng Ban
        { wch: 20 }, // Phòng Ban Cấp Trên
        { wch: 40 }, // Ghi Chú
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'PhongBan');
    // Sheet hướng dẫn
    const guide = XLSX.utils.aoa_to_sheet([
        ['HƯỚNG DẪN NHẬP LIỆU'],
        [''],
        ['Cột', 'Mô tả', 'Bắt buộc', 'Ví dụ'],
        ['Mã PB', 'Mã viết tắt phòng ban (không dấu, in hoa)', 'Có', 'KD'],
        ['Tên Phòng Ban', 'Tên đầy đủ của phòng ban', 'Có', 'Kinh Doanh'],
        ['Phòng Ban Cấp Trên', 'Mã PB của phòng ban cha (tuỳ chọn)', 'Không', 'SX'],
        ['Ghi Chú', 'Ghi chú thêm (tuỳ chọn)', 'Không', ''],
        [''],
        ['Lưu ý:'],
        ['- Không thay đổi tên các cột trong dòng tiêu đề'],
        ['- Mã PB phải là duy nhất, không trùng lặp'],
        ['- Hệ thống sẽ bỏ qua các dòng có Mã PB đã tồn tại'],
    ]);
    guide['!cols'] = [{ wch: 16 }, { wch: 45 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, guide, 'HuongDan');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new server_1.NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="mau_phong_ban.xlsx"',
        },
    });
}
/* ── POST: Import từ file Excel ─────────────── */
async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        if (!file)
            return server_1.NextResponse.json({ error: 'Không có file' }, { status: 400 });
        const buf = Buffer.from(await file.arrayBuffer());
        const wb = XLSX.read(buf, { type: 'buffer' });
        // Đọc sheet đầu tiên
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!data.length)
            return server_1.NextResponse.json({ error: 'File trống' }, { status: 400 });
        // Validate cột bắt buộc
        const firstRow = data[0];
        if (!('Mã PB' in firstRow) || !('Tên Phòng Ban' in firstRow)) {
            return server_1.NextResponse.json({
                error: 'File không đúng cấu trúc. Vui lòng tải mẫu và điền lại.'
            }, { status: 422 });
        }
        const monthId = formData.get('monthId') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        // Build map mã -> id từ DB hiện có (trong tháng này) để resolve parent
        const existing = await conn.all(`SELECT id, code FROM departments WHERE month_id = ?`, monthId);
        const codeToId = new Map(existing.map(r => [r.code.toUpperCase(), r.id]));
        const results = { inserted: 0, skipped: 0, skippedCodes: [], errors: [] };
        const now = new Date().toISOString().slice(0, 10);
        for (const row of data) {
            const code = String(row['Mã PB'] ?? '').trim().toUpperCase();
            const name = String(row['Tên Phòng Ban'] ?? '').trim();
            const parent = String(row['Phòng Ban Cấp Trên'] ?? '').trim().toUpperCase();
            const note = String(row['Ghi Chú'] ?? '').trim();
            if (!code || !name) {
                results.skipped++;
                results.skippedCodes.push(code || '(trống)');
                continue;
            }
            try {
                const parentId = parent ? (codeToId.get(parent) ?? null) : null;
                const newId = Date.now().toString() + Math.random().toString(36).slice(2, 6);
                await conn.run(`INSERT INTO departments (id, month_id, code, name, parent_id, active, note, created_at)
           VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)`, newId, monthId, code, name, parentId, note, now);
                // Cập nhật map để các dòng sau có thể tham chiếu
                codeToId.set(code, newId);
                results.inserted++;
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.includes('UNIQUE') || msg.includes('Duplicate key') || msg.includes('unique constraint')) {
                    results.skipped++;
                    results.skippedCodes.push(code);
                }
                else {
                    results.errors.push(`${code}: ${msg}`);
                }
            }
        }
        await conn.close();
        return server_1.NextResponse.json(results);
    }
    catch (e) {
        console.error('[POST /api/departments/import]', e);
        return server_1.NextResponse.json({ error: 'Lỗi xử lý file' }, { status: 500 });
    }
}
