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
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function GET() {
    const XLSX = await Promise.resolve().then(() => __importStar(require('xlsx')));
    const wb = XLSX.utils.book_new();
    const header = [
        'employee_code', 'employee_name', 'department_code', 'group_code', 'group_code_end_date', 'workdays',
        ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
        'overtime_hours', 'late_minutes', 'phep_nam', 'ngay_nghi_cuoi_thang_truoc',
    ];
    const sample = [
        'NV001', 'Nguyễn Văn A', 'KD', 'FULL', '31/12/2026', 26,
        ...Array(31).fill(''),
        0, 0, 0, '',
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, sample]);
    ws['!cols'] = header.map((_h, i) => ({ wch: i < 6 ? 18 : 5 }));
    XLSX.utils.book_append_sheet(wb, ws, 'cham_cong_template');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new server_1.NextResponse(buf, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="mau_import_nhan_vien.xlsx"',
        },
    });
}
async function POST(req) {
    try {
        const form = await req.formData();
        const file = form.get('file');
        const monthId = form.get('monthId') ?? db_1.DEFAULT_MONTH_ID;
        if (!file)
            return server_1.NextResponse.json({ error: 'Không có file' }, { status: 400 });
        const XLSX = await Promise.resolve().then(() => __importStar(require('xlsx')));
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const conn = await (0, db_1.getConn)();
        // Lấy departments của tháng này — build map theo cả code và name
        const depts = await conn.all(`SELECT id, code, name FROM departments WHERE month_id = ?`, monthId);
        // Map theo code (ưu tiên 1)
        const deptByCode = {};
        // Map theo tên đầy đủ (ưu tiên 2)
        const deptByName = {};
        // Danh sách để partial match (ưu tiên 3)
        const deptList = [];
        depts.forEach(d => {
            deptByCode[d.code.toUpperCase().trim()] = d.id;
            deptByName[d.name.toUpperCase().trim()] = d.id;
            deptList.push(d);
        });
        /** Tìm departmentId theo mã hoặc tên — trả '' nếu không tìm thấy */
        function resolveDept(raw) {
            const key = raw.toUpperCase().trim();
            if (!key)
                return '';
            // 1. Khớp mã chính xác
            if (deptByCode[key])
                return deptByCode[key];
            // 2. Khớp tên chính xác
            if (deptByName[key])
                return deptByName[key];
            // 3. Partial: tên phòng ban chứa từ khóa hoặc ngược lại
            const found = deptList.find(d => d.name.toUpperCase().includes(key) || key.includes(d.name.toUpperCase()) ||
                d.code.toUpperCase().includes(key));
            return found?.id ?? '';
        }
        let inserted = 0, skipped = 0;
        const skippedCodes = [], errors = [];
        const unmappedDept = [];
        const dayColList = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`).join(', ');
        const dayPlaceholders = Array(31).fill('?').join(', ');
        for (const row of rows) {
            const code = String(row['employee_code'] ?? '').trim();
            const name = String(row['employee_name'] ?? '').trim();
            if (!code || !name)
                continue;
            const maPbRaw = String(row['department_code'] ?? row['department_name'] ?? row['Mã PB'] ?? '').trim();
            const departmentId = resolveDept(maPbRaw);
            const specialGroup = String(row['group_code'] ?? '').trim();
            const groupCodeEndDate = String(row['group_code_end_date'] ?? '').trim();
            const workdays = String(row['workdays'] ?? '').trim();
            const overtimeHours = String(row['overtime_hours'] ?? '').trim();
            const lateMinutes = String(row['late_minutes'] ?? '').trim();
            const phepNam = String(row['phep_nam'] ?? '').trim();
            const ngayNghiCuoiThangTruoc = String(row['ngay_nghi_cuoi_thang_truoc'] ?? '').trim();
            const dayVals = Array.from({ length: 31 }, (_, i) => String(row[`Day ${i + 1}`] ?? '').trim());
            if (maPbRaw && !departmentId) {
                unmappedDept.push({ code, name, deptCode: maPbRaw });
            }
            try {
                await conn.run(`INSERT INTO employees
             (id, month_id, code, name, department_id, ma_pb, special_group, group_code_end_date,
              workdays, overtime_hours, late_minutes, phep_nam, ngay_nghi_cuoi_thang_truoc, active, created_at, ${dayColList})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ${dayPlaceholders})`, Date.now().toString() + Math.random().toString(36).slice(2, 5), monthId, code, name, departmentId, maPbRaw, specialGroup, groupCodeEndDate, workdays, overtimeHours, lateMinutes, phepNam, ngayNghiCuoiThangTruoc, new Date().toISOString().slice(0, 10), ...dayVals);
                inserted++;
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.includes('UNIQUE')) {
                    skipped++;
                    skippedCodes.push(code);
                }
                else
                    errors.push(`${code}: ${msg}`);
            }
        }
        await conn.close();
        return server_1.NextResponse.json({ inserted, skipped, skippedCodes, errors, unmappedDept });
    }
    catch (e) {
        console.error('[POST /api/employees/import]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
