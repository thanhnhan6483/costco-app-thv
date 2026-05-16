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
const stepHelpers_1 = require("@/lib/stepHelpers");
exports.runtime = 'nodejs';
const DT_LABEL = {
    0: 'X', 1: 'LP', 2: 'PN', 3: 'Ô', 4: 'TS', 5: 'DS', 6: 'O', 7: 'NL', 8: 'OF', 9: 'P',
    10: 'X/2', 11: 'LL', 12: 'LN', 13: 'H', 14: 'B',
};
/**
 * GET /api/distribution/export?month=&step=
 * step: 1=Xem dữ liệu, 2=Phân bổ ngày công, 3=Chia ca, 4=OT&Trễ, 5=Giờ vào/ra, 6=Kết quả
 */
async function GET(req) {
    const url = new URL(req.url);
    const monthId = url.searchParams.get('month') ?? '';
    const step = Number(url.searchParams.get('step') ?? '2');
    const withShift = url.searchParams.get('withShift') === '1';
    if (!monthId)
        return server_1.NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
    const conn = await (0, db_1.getConn)();
    try {
        const { daysInMonth } = await (0, stepHelpers_1.loadMonthInfo)(monthId);
        const XLSX = await Promise.resolve().then(() => __importStar(require('xlsx')));
        const wb = XLSX.utils.book_new();
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let header = [];
        let data = [];
        let sheetName = 'Sheet1';
        let fileName = `buoc${step}_${today}.xlsx`;
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        if (step === 1) {
            // Bước 1: Xem dữ liệu nhân viên — thứ tự cột khớp với bảng giao diện ImportGrid
            sheetName = 'Buoc1_DuLieu';
            fileName = `buoc1_du_lieu_${today}.xlsx`;
            const rows = await conn.all(`SELECT e.code, e.name,
                COALESCE(d1.name, d2.name) AS deptName,
                ${days.map(d => `e.day_${d}`).join(', ')},
                e.workdays, e.overtime_hours, e.late_minutes, e.phep_nam
         FROM employees e
         LEFT JOIN departments d1 ON d1.id = e.department_id AND d1.month_id = e.month_id AND e.department_id <> ''
         LEFT JOIN departments d2 ON UPPER(d2.code) = UPPER(e.ma_pb) AND d2.month_id = e.month_id AND e.ma_pb <> ''
         WHERE e.month_id = ? AND e.active = TRUE ORDER BY e.code`, monthId);
            header = ['Mã NV', 'Tên', 'Phòng ban',
                ...days.map(d => String(d)),
                'Ngày công', 'Tăng ca (H)', 'Trễ (ph)', 'Phép năm'];
            data = rows.map(r => [
                r.code, r.name, r.deptName ?? '',
                ...days.map(d => r[`day_${d}`] ?? ''),
                r.workdays ?? '', r.overtime_hours ?? '', r.late_minutes ?? '', r.phep_nam ?? '',
            ]);
        }
        else if (step === 2) {
            // Bước 2: Phân bổ ngày công — theo mẫu Attendance
            sheetName = 'Attendance';
            fileName = `buoc2_ngay_cong_${today}.xlsx`;
            const rows = await conn.all(`SELECT e.code, e.name, d.name AS deptName,
                e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
                dr.day, dr.day_type
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId);
            const empMap = new Map();
            for (const r of rows) {
                const k = String(r.code);
                if (!empMap.has(k))
                    empMap.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '' });
                empMap.get(k)[`d${r.day}`] = DT_LABEL[Number(r.day_type)] ?? '';
            }
            // Tính thứ từ monthId — lấy fromDate từ bảng months
            const [monthRow] = await conn.all(`SELECT from_date AS fromDate FROM months WHERE id = ?`, monthId);
            const DOW_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            let dowRow = ['', '', '', ''];
            if (monthRow?.fromDate) {
                // fromDate dạng DD/MM/YYYY
                const [dd, mm, yyyy] = monthRow.fromDate.split('/').map(Number);
                dowRow = ['', '', '', '', ...days.map(d => {
                        const date = new Date(yyyy, mm - 1, d);
                        return date.getMonth() === mm - 1 ? DOW_VN[date.getDay()] : '';
                    }), '', '', '', ''];
            }
            header = ['STT', 'Mã NV', 'Họ và tên', 'Phòng\nban', ...days.map(d => String(d)),
                'NGÀY CÔNG', 'LP', 'PN', 'NGHỈ THÁNG TRƯỚC'];
            const empArr = Array.from(empMap.values());
            data = empArr.map((r, idx) => {
                const dayVals = days.map(d => r[`d${d}`] ?? '');
                const lam = dayVals.filter(v => v === 'X').length;
                const nghi = dayVals.filter(v => v === 'LP').length;
                const pn = dayVals.filter(v => v === 'PN').length;
                return [idx + 1, r.code, r.name, r.deptName, ...dayVals, lam, nghi, pn, r.ngayNghiCuoiThangTruoc];
            });
            const ws2 = XLSX.utils.aoa_to_sheet([header, dowRow, ...data]);
            // Style header row
            const range2 = XLSX.utils.decode_range(ws2['!ref'] ?? 'A1');
            for (let c = range2.s.c; c <= range2.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r: 0, c });
                if (ws2[addr])
                    ws2[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center', wrapText: true } };
                const addr2 = XLSX.utils.encode_cell({ r: 1, c });
                if (ws2[addr2] && ws2[addr2].v)
                    ws2[addr2].s = { font: { italic: true, sz: 8 }, alignment: { horizontal: 'center' } };
            }
            ws2['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, ...Array(daysInMonth).fill({ wch: 7 }), { wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, ws2, sheetName);
            const buf2 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
            await conn.close();
            return new server_1.NextResponse(buf2, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                },
            });
        }
        else if (step === 3) {
            // Bước 3: Chia ca — theo mẫu Bước 2
            sheetName = 'ChiaCa';
            fileName = `buoc3_chia_ca_${today}.xlsx`;
            const rows = await conn.all(`SELECT e.code, e.name, d.name AS deptName, dr.day, dr.day_type, dr.shift_code
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId);
            const empMap3 = new Map();
            for (const r of rows) {
                const k = String(r.code);
                if (!empMap3.has(k))
                    empMap3.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '' });
                const dt = Number(r.day_type);
                const sc = String(r.shift_code ?? '');
                empMap3.get(k)[`d${r.day}`] = dt === 0 ? (sc || 'X') : (DT_LABEL[dt] ?? '');
            }
            // Hàng thứ trong tuần (giống Bước 2)
            const [monthRow3] = await conn.all(`SELECT from_date AS fromDate FROM months WHERE id = ?`, monthId);
            const DOW_VN3 = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            let dowRow3 = ['', '', '', '', ...Array(daysInMonth).fill(''), '', '', ''];
            if (monthRow3?.fromDate) {
                const [dd3, mm3, yyyy3] = monthRow3.fromDate.split('/').map(Number);
                dowRow3 = ['', '', '', '', ...days.map(d => {
                        const date = new Date(yyyy3, mm3 - 1, d);
                        return date.getMonth() === mm3 - 1 ? DOW_VN3[date.getDay()] : '';
                    }), '', '', ''];
            }
            const header3 = ['STT', 'Mã NV', 'Họ và tên', 'Phòng\nban', ...days.map(d => String(d)), 'Ca 1', 'Ca 2', 'C'];
            const empArr3 = Array.from(empMap3.values());
            const data3 = empArr3.map((r, idx) => {
                const dayVals = days.map(d => String(r[`d${d}`] ?? ''));
                return [idx + 1, r.code, r.name, r.deptName, ...dayVals,
                    dayVals.filter(v => v === 'Ca 1').length,
                    dayVals.filter(v => v === 'Ca 2').length,
                    dayVals.filter(v => v === 'C').length,
                ];
            });
            const ws3 = XLSX.utils.aoa_to_sheet([header3, dowRow3, ...data3]);
            const range3 = XLSX.utils.decode_range(ws3['!ref'] ?? 'A1');
            for (let c = range3.s.c; c <= range3.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r: 0, c });
                if (ws3[addr])
                    ws3[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center', wrapText: true } };
                const addr2 = XLSX.utils.encode_cell({ r: 1, c });
                if (ws3[addr2] && ws3[addr2].v)
                    ws3[addr2].s = { font: { italic: true, sz: 8 }, alignment: { horizontal: 'center' } };
            }
            ws3['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, ...Array(daysInMonth).fill({ wch: 7 }), { wch: 7 }, { wch: 7 }, { wch: 7 }];
            XLSX.utils.book_append_sheet(wb, ws3, sheetName);
            const buf3 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
            await conn.close();
            return new server_1.NextResponse(buf3, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                },
            });
        }
        else if (step === 4) {
            // Bước 4: OT & Đi trễ — theo mẫu Bước 2
            sheetName = 'OT_DiTre';
            fileName = `buoc4_ot_tre_${today}.xlsx`;
            const rows4 = await conn.all(`SELECT e.code, e.name, d.name AS deptName, dr.day, dr.day_type, dr.ot_hours, dr.late_mins
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId);
            const empMap4 = new Map();
            for (const r of rows4) {
                const k = String(r.code);
                if (!empMap4.has(k))
                    empMap4.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', totalOt: 0, totalLate: 0 });
                const dt = Number(r.day_type);
                const ot = Number(r.ot_hours) || 0;
                const late = Number(r.late_mins) || 0;
                // Hiển thị: nếu ngày làm (dt=0) thì OT/Trễ, ngày nghỉ thì ký hiệu
                empMap4.get(k)[`dt${r.day}`] = dt;
                empMap4.get(k)[`ot${r.day}`] = ot;
                empMap4.get(k)[`late${r.day}`] = late;
                empMap4.get(k).totalOt = Number(empMap4.get(k).totalOt) + ot;
                empMap4.get(k).totalLate = Number(empMap4.get(k).totalLate) + late;
            }
            const [monthRow4] = await conn.all(`SELECT from_date AS fromDate FROM months WHERE id = ?`, monthId);
            const DOW_VN4 = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            let dowRow4 = ['', '', '', '', ...Array(daysInMonth).fill(''), '', ''];
            if (monthRow4?.fromDate) {
                const [, mm4, yyyy4] = monthRow4.fromDate.split('/').map(Number);
                dowRow4 = ['', '', '', '', ...days.map(d => {
                        const date = new Date(yyyy4, mm4 - 1, d);
                        return date.getMonth() === mm4 - 1 ? DOW_VN4[date.getDay()] : '';
                    }), '', ''];
            }
            const header4 = ['STT', 'Mã NV', 'Họ và tên', 'Phòng\nban', ...days.map(d => String(d)), 'TĂNG CA (H)', 'TRỄ(PH)'];
            const empArr4 = Array.from(empMap4.values());
            const data4 = empArr4.map((r, idx) => {
                const dayVals = days.map(d => {
                    const dt = Number(r[`dt${d}`] ?? -1);
                    const ot = Number(r[`ot${d}`]) || 0;
                    const late = Number(r[`late${d}`]) || 0;
                    if (dt === 0) {
                        if (ot > 0 && late > 0)
                            return `${ot}h/${late}ph`;
                        if (ot > 0)
                            return `${ot}h`;
                        if (late > 0)
                            return `${late}ph`;
                        return 'X';
                    }
                    return dt >= 0 ? (DT_LABEL[dt] ?? '') : '';
                });
                const totalOt = Number(r.totalOt);
                const totalLate = Number(r.totalLate);
                return [idx + 1, r.code, r.name, r.deptName, ...dayVals,
                    totalOt > 0 ? totalOt : '',
                    totalLate > 0 ? totalLate : '',
                ];
            });
            const ws4 = XLSX.utils.aoa_to_sheet([header4, dowRow4, ...data4]);
            const range4 = XLSX.utils.decode_range(ws4['!ref'] ?? 'A1');
            for (let c = range4.s.c; c <= range4.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r: 0, c });
                if (ws4[addr])
                    ws4[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center', wrapText: true } };
                const addr2 = XLSX.utils.encode_cell({ r: 1, c });
                if (ws4[addr2] && ws4[addr2].v)
                    ws4[addr2].s = { font: { italic: true, sz: 8 }, alignment: { horizontal: 'center' } };
            }
            ws4['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, ...Array(daysInMonth).fill({ wch: 7 }), { wch: 8 }, { wch: 8 }];
            XLSX.utils.book_append_sheet(wb, ws4, sheetName);
            const buf4 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
            await conn.close();
            return new server_1.NextResponse(buf4, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                },
            });
        }
        else if (step === 5) {
            // Bước 5: Giờ vào/ra
            const rows5 = await conn.all(`SELECT e.code, e.name, d.name AS deptName,
                dr.day, dr.day_type, dr.check_in, dr.check_out, dr.shift_code
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId);
            const empMap5 = new Map();
            for (const r of rows5) {
                const k = String(r.code);
                if (!empMap5.has(k))
                    empMap5.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '' });
                const dt = Number(r.day_type);
                const ci = String(r.check_in ?? '');
                const co = String(r.check_out ?? '');
                const sc = String(r.shift_code ?? '');
                if (dt === 0) {
                    empMap5.get(k)[`in${r.day}`] = ci || '00:00';
                    empMap5.get(k)[`out${r.day}`] = co || '00:00';
                    // Ca: extract number from "Ca 1" → "1", "Ca 2" → "2", "C" → "C"
                    empMap5.get(k)[`ca${r.day}`] = sc === 'C' ? 'C' : (sc.match(/\d+/)?.[0] ?? '');
                }
                else {
                    const sym = DT_LABEL[dt] ?? '';
                    empMap5.get(k)[`in${r.day}`] = sym;
                    empMap5.get(k)[`out${r.day}`] = sym;
                    empMap5.get(k)[`ca${r.day}`] = '';
                }
            }
            const [monthRow5] = await conn.all(`SELECT from_date AS fromDate FROM months WHERE id = ?`, monthId);
            const DOW_VN5 = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            const cols = withShift ? 3 : 2;
            let dowRow5;
            let inOutRow;
            let header5;
            if (monthRow5?.fromDate) {
                const [, mm5, yyyy5] = monthRow5.fromDate.split('/').map(Number);
                dowRow5 = ['', '', '', '', ...days.flatMap(d => {
                        const date = new Date(yyyy5, mm5 - 1, d);
                        const dow = date.getMonth() === mm5 - 1 ? DOW_VN5[date.getDay()] : '';
                        return Array(cols).fill(dow);
                    })];
            }
            else {
                dowRow5 = ['', '', '', '', ...Array(daysInMonth * cols).fill('')];
            }
            inOutRow = ['', '', '', '', ...days.flatMap(() => withShift ? ['In', 'Out', 'Ca'] : ['In', 'Out'])];
            header5 = ['STT', 'Mã NV', 'Tên nhân viên', 'Phòng\nban', ...days.flatMap(d => Array(cols).fill(d))];
            const empArr5 = Array.from(empMap5.values());
            const data5 = empArr5.map((r, idx) => [
                idx + 1, r.code, r.name, r.deptName,
                ...days.flatMap(d => withShift
                    ? [r[`in${d}`] ?? '', r[`out${d}`] ?? '', r[`ca${d}`] ?? '']
                    : [r[`in${d}`] ?? '', r[`out${d}`] ?? '']),
            ]);
            sheetName = 'Attendance';
            fileName = withShift ? `buoc5_gio_vao_ra_ca_${today}.xlsx` : `buoc5_gio_vao_ra_${today}.xlsx`;
            const ws5 = XLSX.utils.aoa_to_sheet([header5, dowRow5, inOutRow, ...data5]);
            const range5 = XLSX.utils.decode_range(ws5['!ref'] ?? 'A1');
            for (let rr = 0; rr < 3; rr++) {
                for (let c = range5.s.c; c <= range5.e.c; c++) {
                    const addr = XLSX.utils.encode_cell({ r: rr, c });
                    if (!ws5[addr])
                        continue;
                    if (rr === 0)
                        ws5[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center', wrapText: true } };
                    else if (rr === 1)
                        ws5[addr].s = { font: { italic: true, sz: 8 }, alignment: { horizontal: 'center' } };
                    else
                        ws5[addr].s = { font: { bold: true, sz: 8 }, fill: { fgColor: { rgb: 'F2F2F2' } }, alignment: { horizontal: 'center' } };
                }
            }
            ws5['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, ...Array(daysInMonth * cols).fill({ wch: 7 })];
            XLSX.utils.book_append_sheet(wb, ws5, sheetName);
            const buf5 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
            await conn.close();
            return new server_1.NextResponse(buf5, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                },
            });
        }
        else {
            // Bước 6: Kết quả — theo mẫu Attendance_buoc61
            sheetName = 'Attendance';
            fileName = `buoc6_ket_qua_${today}.xlsx`;
            const rows6 = await conn.all(`SELECT e.code, e.name,
                COALESCE(d1.name, d2.name) AS deptName,
                e.special_group AS nhom,
                e.ngay_nghi_cuoi_thang_truoc AS ngayNghi,
                e.workdays, e.overtime_hours AS overtimeHours, e.late_minutes AS lateMinutes,
                dr.day, dr.day_type, dr.check_in, dr.check_out, dr.ot_hours, dr.late_mins
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d1 ON d1.id = e.department_id AND d1.month_id = e.month_id AND e.department_id <> ''
         LEFT JOIN departments d2 ON UPPER(d2.code) = UPPER(e.ma_pb) AND d2.month_id = e.month_id AND e.ma_pb <> ''
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId);
            // Build employee map
            const empMap6 = new Map();
            for (const r of rows6) {
                const k = String(r.code);
                if (!empMap6.has(k)) {
                    empMap6.set(k, {
                        code: r.code, name: r.name,
                        deptName: r.deptName ?? '',
                        nhom: r.nhom ?? '',
                        ngayNghi: r.ngayNghi ?? '',
                        workdays: r.workdays ?? '',
                        totalLP: 0, totalPN: 0, totalOT: 0, totalLate: 0,
                    });
                }
                const dt = Number(r.day_type);
                const emp = empMap6.get(k);
                if (dt === 0) {
                    emp[`in${r.day}`] = r.check_in || '00:00';
                    emp[`out${r.day}`] = r.check_out || '00:00';
                    emp.totalOT = Number(emp.totalOT) + (Number(r.ot_hours) || 0);
                    emp.totalLate = Number(emp.totalLate) + (Number(r.late_mins) || 0);
                }
                else {
                    const sym = DT_LABEL[dt] ?? '';
                    emp[`in${r.day}`] = sym;
                    emp[`out${r.day}`] = sym;
                    if (dt === 1)
                        emp.totalLP = Number(emp.totalLP) + 1;
                    if (dt === 2)
                        emp.totalPN = Number(emp.totalPN) + 1;
                }
            }
            // Get day-of-week
            const [monthRow6] = await conn.all(`SELECT from_date AS fromDate FROM months WHERE id = ?`, monthId);
            const DOW_VN6 = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            const FIXED_COLS = 6; // STT, Mã NV, Tên, Phòng ban, Nhóm, Ngày nghỉ
            const SUMMARY_COLS = ['NGÀY CÔNG', 'LP', 'PN', 'TĂNG CA(H)', 'TRỄ(PH)'];
            // Row 0: header — fixed cols + day numbers (each repeated 2 times) + summary
            const row0 = ['STT', 'Mã NV', 'Tên nhân viên', 'Phòng\nban', 'Nhóm', 'Ngày nghỉ của tháng',
                ...days.flatMap(d => [d, d]), ...SUMMARY_COLS];
            // Row 1: day of week (each repeated 2 times) + empty for summary
            const row1 = ['', '', '', '', '', ''];
            if (monthRow6?.fromDate) {
                const [, mm6, yyyy6] = monthRow6.fromDate.split('/').map(Number);
                for (const d of days) {
                    const date = new Date(yyyy6, mm6 - 1, d);
                    const dow = date.getMonth() === mm6 - 1 ? DOW_VN6[date.getDay()] : '';
                    row1.push(dow, dow);
                }
            }
            else {
                row1.push(...Array(daysInMonth * 2).fill(''));
            }
            row1.push(...Array(SUMMARY_COLS.length).fill(''));
            // Row 2: In/Out labels + empty for summary
            const row2 = ['', '', '', '', '', '',
                ...days.flatMap(() => ['In', 'Out']), ...Array(SUMMARY_COLS.length).fill('')];
            // Data rows
            const empArr6 = Array.from(empMap6.values());
            const dataRows6 = empArr6.map((r, idx) => [
                idx + 1, r.code, r.name, r.deptName, r.nhom, r.ngayNghi,
                ...days.flatMap(d => [r[`in${d}`] ?? '', r[`out${d}`] ?? '']),
                r.workdays, r.totalLP, r.totalPN,
                Number(r.totalOT) > 0 ? r.totalOT : '',
                Number(r.totalLate) > 0 ? r.totalLate : '',
            ]);
            const ws6 = XLSX.utils.aoa_to_sheet([row0, row1, row2, ...dataRows6]);
            // Merges: fixed cols A-F merge rows 0-2; each day pair merge row 0 and row 1; summary cols merge rows 0-2
            const merges = [];
            for (let c = 0; c < FIXED_COLS; c++) {
                merges.push({ s: { r: 0, c }, e: { r: 2, c } });
            }
            for (let i = 0; i < daysInMonth; i++) {
                const c = FIXED_COLS + i * 2;
                merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 1 } });
                merges.push({ s: { r: 1, c }, e: { r: 1, c: c + 1 } });
            }
            const summaryStart = FIXED_COLS + daysInMonth * 2;
            for (let i = 0; i < SUMMARY_COLS.length; i++) {
                merges.push({ s: { r: 0, c: summaryStart + i }, e: { r: 2, c: summaryStart + i } });
            }
            ws6['!merges'] = merges;
            // Styles
            const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
            const dowStyle = { font: { italic: true, sz: 8 }, alignment: { horizontal: 'center', vertical: 'center' } };
            const inOutStyle = { font: { bold: true, sz: 8 }, fill: { fgColor: { rgb: 'F2F2F2' } }, alignment: { horizontal: 'center' } };
            const totalCols = FIXED_COLS + daysInMonth * 2 + SUMMARY_COLS.length;
            for (let c = 0; c < totalCols; c++) {
                const a0 = XLSX.utils.encode_cell({ r: 0, c });
                const a1 = XLSX.utils.encode_cell({ r: 1, c });
                const a2 = XLSX.utils.encode_cell({ r: 2, c });
                if (ws6[a0])
                    ws6[a0].s = headerStyle;
                if (ws6[a1])
                    ws6[a1].s = dowStyle;
                if (ws6[a2])
                    ws6[a2].s = inOutStyle;
            }
            // Col widths
            ws6['!cols'] = [
                { wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 18 },
                ...Array(daysInMonth * 2).fill({ wch: 7 }),
                { wch: 11 }, { wch: 6 }, { wch: 6 }, { wch: 11 }, { wch: 9 },
            ];
            // Row heights for header rows
            ws6['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 15 }];
            XLSX.utils.book_append_sheet(wb, ws6, sheetName);
            const buf6 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
            await conn.close();
            return new server_1.NextResponse(buf6, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                },
            });
        }
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
