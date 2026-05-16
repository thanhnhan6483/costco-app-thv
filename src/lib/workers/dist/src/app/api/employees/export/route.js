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
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
const DAY_COLS = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`);
const SELECT_DAYS = DAY_COLS.map(c => `e.${c}`).join(', ');
async function GET(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        const rows = await conn.all(`
      SELECT e.code AS employee_code,
             e.name AS employee_name,
             COALESCE(d1.code, d2.code, e.ma_pb) AS department_code,
             COALESCE(d1.name, d2.name)           AS department_name,
             e.special_group                       AS group_code,
             sg.name                               AS group_name,
             e.group_code_end_date,
             e.workdays,
             ${SELECT_DAYS},
             e.overtime_hours,
             e.late_minutes,
             e.phep_nam,
             e.ngay_nghi_cuoi_thang_truoc
      FROM employees e
      LEFT JOIN departments  d1 ON d1.id   = e.department_id  AND d1.month_id = e.month_id AND e.department_id <> ''
      LEFT JOIN departments  d2 ON UPPER(d2.code) = UPPER(e.ma_pb) AND d2.month_id = e.month_id AND e.ma_pb <> ''
      LEFT JOIN special_groups sg ON UPPER(sg.code) = UPPER(e.special_group) AND sg.month_id = e.month_id AND e.special_group <> ''
      WHERE e.month_id = ?
      ORDER BY e.code
    `, monthId);
        await conn.close();
        const XLSX = await Promise.resolve().then(() => __importStar(require('xlsx')));
        const wb = XLSX.utils.book_new();
        const header = [
            'employee_code', 'employee_name',
            'department_code', 'department_name',
            'group_code', 'group_name',
            'group_code_end_date', 'workdays',
            ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
            'overtime_hours', 'late_minutes', 'phep_nam', 'ngay_nghi_thang_truoc',
        ];
        const data = rows.map((r) => [
            r['employee_code'] ?? '',
            r['employee_name'] ?? '',
            r['department_code'] ?? '',
            r['department_name'] ?? '',
            r['group_code'] ?? '',
            r['group_name'] ?? '',
            r['group_code_end_date'] ?? '',
            r['workdays'] ?? '',
            ...Array.from({ length: 31 }, (_, i) => r[`day_${i + 1}`] ?? ''),
            r['overtime_hours'] ?? '',
            r['late_minutes'] ?? '',
            r['phep_nam'] ?? '',
            r['ngay_nghi_cuoi_thang_truoc'] ?? '',
        ]);
        const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
        ws['!cols'] = [
            { wch: 14 }, { wch: 22 },
            { wch: 12 }, { wch: 22 },
            { wch: 16 }, { wch: 24 },
            { wch: 16 }, { wch: 8 },
            ...Array(31).fill({ wch: 5 }),
            { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 },
        ];
        const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
        for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r: 0, c });
            if (!ws[addr])
                continue;
            ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center' } };
        }
        XLSX.utils.book_append_sheet(wb, ws, 'Danh_sach_NV');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return new server_1.NextResponse(buf, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="danh_sach_nhan_vien_${today}.xlsx"`,
            },
        });
    }
    catch (e) {
        console.error('[GET /api/employees/export]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
