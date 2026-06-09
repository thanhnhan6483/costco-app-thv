import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

const DT_LABEL: Record<number, string> = {
  0: 'X', 1: 'LP', 2: 'PN', 3: 'Ô', 4: 'TS', 5: 'DS', 6: 'O', 7: 'NL', 8: 'OF', 9: 'P',
  10: 'X/2', 11: 'LL', 12: 'LN', 13: 'H', 14: 'B',
};
const DT_BG: Record<number, string> = { 0: 'F0FDF4', 1: 'F1F5F9', 2: 'F5F3FF', 3: 'FEF2F2', 4: 'FDF2F8', 5: 'F0FDFA', 6: 'FFF7ED', 7: 'EFF6FF', 8: 'F8FAFC', 9: 'ECFEFF' };
const DT_CLR: Record<number, string> = { 0: '15803D', 1: '475569', 2: '6D28D9', 3: 'B91C1C', 4: 'BE185D', 5: '0F766E', 6: 'C2410C', 7: '1D4ED8', 8: '4B5563', 9: '0E7490' };
const BORDER = { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } };
const BORDER_DARK = { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'thin', color: { rgb: 'CBD5E1' } }, left: { style: 'thin', color: { rgb: 'CBD5E1' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } } };
const HDR_STYLE = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER_DARK };
const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function fmtDate(v: string): string {
  if (!v) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) { const [y, m, d] = v.slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
  return v;
}

function buildDowIdx(fromDate: string | undefined, days: number[]): number[] {
  if (!fromDate) return days.map(() => -1);
  const [, mm, yyyy] = fromDate.split('/').map(Number);
  return days.map(d => { const date = new Date(yyyy, mm - 1, d); return date.getMonth() === mm - 1 ? date.getDay() : -1; });
}

function encodeCell(r: number, c: number): string {
  const col = c < 26 ? String.fromCharCode(65 + c) : String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26));
  return `${col}${r + 1}`;
}

function applyStyles(
  ws: Record<string, unknown>, totalCols: number, fixedCols: number, daysInMonth: number,
  dowIdx: number[], headerRowCount: number, dowRowIdx: number, inOutRowIdx: number,
  totalDataRows: number, getDayType: (ri: number, di: number) => number, colsPerDay = 1,
) {
  for (let hr = 0; hr < headerRowCount; hr++) {
    for (let c = 0; c < totalCols; c++) {
      const addr = encodeCell(hr, c);
      if (!(ws as any)[addr]) (ws as any)[addr] = { t: 's', v: '' };
      if (hr === dowRowIdx) {
        const di = Math.floor((c - fixedCols) / colsPerDay);
        const dow = di >= 0 && di < daysInMonth ? dowIdx[di] : -1;
        const color = dow === 0 ? 'DC2626' : dow === 6 ? '2563EB' : '64748B';
        (ws as any)[addr].s = { font: { bold: true, sz: 8, color: { rgb: color } }, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER };
      } else if (hr === inOutRowIdx) {
        (ws as any)[addr].s = { font: { bold: true, sz: 8 }, fill: { fgColor: { rgb: 'F2F2F2' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER };
      } else {
        (ws as any)[addr].s = HDR_STYLE;
      }
    }
  }
  for (let ri = 0; ri < totalDataRows; ri++) {
    const rowIdx = headerRowCount + ri;
    for (let c = 0; c < totalCols; c++) {
      const addr = encodeCell(rowIdx, c);
      if (!(ws as any)[addr]) (ws as any)[addr] = { t: 's', v: '' };
      const di = Math.floor((c - fixedCols) / colsPerDay);
      if (di >= 0 && di < daysInMonth) {
        const dt = getDayType(ri, di);
        const bg = dt >= 0 ? (DT_BG[dt] ?? 'FFFFFF') : 'FFFFFF';
        const clr = dt >= 0 ? (DT_CLR[dt] ?? '374151') : 'D1D5DB';
        const dow = dowIdx[di];
        const weekendBg = dow === 0 ? 'FFF1F2' : dow === 6 ? 'EFF6FF' : bg;
        (ws as any)[addr].s = { font: { bold: dt === 0, sz: 9, color: { rgb: clr } }, fill: { fgColor: { rgb: weekendBg } }, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER };
      } else {
        (ws as any)[addr].s = { font: { sz: 9 }, alignment: { horizontal: c < fixedCols ? 'left' : 'center', vertical: 'center' }, border: BORDER };
      }
    }
  }
}


export async function GET(req: NextRequest) {
  const monthId = new URL(req.url).searchParams.get('month') ?? '';
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const { daysInMonth } = await loadMonthInfo(monthId);
    const XLSX = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const [monthRow] = await conn.all<{ fromDate: string; month: string }>(`SELECT from_date AS fromDate, month FROM months WHERE id = ?`, monthId);
    const monthLabel = monthRow?.month ? 'Thang_' + monthRow.month.replace('/', '') : monthId;
    const dowIdx = buildDowIdx(monthRow?.fromDate, days);

    // ── SHEET 1: Dữ liệu gốc ────────────────────────────────────────────────
    const rows1 = await conn.all(
      `SELECT e.code, e.name, d.name AS deptName,
              sg.name AS specialGroupName, e.special_group AS specialGroup,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              ${days.map(d => `e.day_${d}`).join(', ')},
              e.workdays, e.phep_nam, e.overtime_hours, e.late_minutes
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN special_groups sg ON UPPER(sg.code) = UPPER(e.special_group) AND sg.month_id = e.month_id AND e.special_group <> ''
       WHERE e.month_id = ? AND e.active = TRUE ORDER BY e.code`, monthId
    ) as Record<string, unknown>[];

    const FIXED1 = 5;
    const SYM_DT: Record<string, number> = { X: 0, LP: 1, PN: 2, Ô: 3, TS: 4, DS: 5, O: 6, NL: 7, OF: 8, P: 9 };
    const header1 = ['MÃ NV', 'TÊN NHÂN VIÊN', 'PHÒNG BAN', 'NHÓM ĐẶC THÙ', 'NGHỈ THÁNG TRƯỚC', ...days.map(d => String(d)), 'NGÀY CÔNG', 'PHÉP NĂM', 'TĂNG CA (H)', 'GIỜ TRỄ (PH)'];
    const dowRow1 = ['', '', '', '', '', ...dowIdx.map(i => i >= 0 ? DOW_SHORT[i] : ''), '', '', '', ''];
    const data1 = rows1.map(r => [
      r.code, r.name, r.deptName ?? '',
      (r.specialGroupName || r.specialGroup || '') as string,
      fmtDate(String(r.ngayNghiCuoiThangTruoc ?? '')),
      ...days.map(d => r[`day_${d}`] ?? ''),
      r.workdays != null ? Math.round(Number(r.workdays)) : '',
      r.phep_nam != null ? Math.round(Number(r.phep_nam)) : '',
      r.overtime_hours ? parseFloat(String(r.overtime_hours)) : '',
      r.late_minutes ? parseFloat(String(r.late_minutes)) : '',
    ]);
    const ws1 = XLSX.utils.aoa_to_sheet([header1, dowRow1, ...data1]);
    applyStyles(ws1, header1.length, FIXED1, daysInMonth, dowIdx, 2, 1, -1, rows1.length,
      (ri, di) => SYM_DT[String(rows1[ri][`day_${days[di]}`] ?? '')] ?? -1);
    ws1['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, ...Array(daysInMonth).fill({ wch: 4.5 }), { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 8 }];
    ws1['!rows'] = [{ hpt: 28 }, { hpt: 14 }];
    ws1['!freeze'] = { xSplit: FIXED1, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws1, 'Buoc1_DuLieu');

    // ── SHEET 2: Phân bổ ngày công ───────────────────────────────────────────
    const rows2 = await conn.all(
      `SELECT e.code, e.name, d.name AS deptName,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              e.phep_nam AS phepNam, dr.day, dr.day_type
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
    ) as Record<string, unknown>[];

    const empMap2 = new Map<string, Record<string, unknown>>();
    for (const r of rows2) {
      const k = String(r.code);
      if (!empMap2.has(k)) empMap2.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '', phepNam: r.phepNam ?? '' });
      empMap2.get(k)![`d${r.day}`] = Number(r.day_type);
    }
    const empArr2 = Array.from(empMap2.values());
    const FIXED2 = 5;
    const header2 = ['STT', 'Mã NV', 'Họ và tên', 'Phòng ban', 'NGHỈ THÁNG TRƯỚC', ...days.map(d => String(d)), 'NGÀY CÔNG', 'PHÉP NĂM', 'LP', 'PN'];
    const dowRow2 = ['', '', '', '', '', ...dowIdx.map(i => i >= 0 ? DOW_SHORT[i] : ''), '', '', '', ''];
    const data2 = empArr2.map((r, idx) => {
      const dts = days.map(d => r[`d${d}`] as number ?? -1);
      return [idx + 1, r.code, r.name, r.deptName, fmtDate(String(r.ngayNghiCuoiThangTruoc ?? '')),
        ...dts.map(dt => dt >= 0 ? (DT_LABEL[dt] ?? '') : ''),
        dts.filter(v => v === 0).length, r.phepNam, dts.filter(v => v === 1).length, dts.filter(v => v === 2).length];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([header2, dowRow2, ...data2]);
    applyStyles(ws2, header2.length, FIXED2, daysInMonth, dowIdx, 2, 1, -1, empArr2.length,
      (ri, di) => empArr2[ri][`d${days[di]}`] as number ?? -1);
    ws2['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, ...Array(daysInMonth).fill({ wch: 4.5 }), { wch: 10 }, { wch: 9 }, { wch: 6 }, { wch: 6 }];
    ws2['!rows'] = [{ hpt: 28 }, { hpt: 14 }];
    ws2['!freeze'] = { xSplit: FIXED2, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws2, 'Buoc2_NgayCong');


    // ── SHEET 3: Chia ca ─────────────────────────────────────────────────────
    const rows3 = await conn.all(
      `SELECT e.code, e.name, d.name AS deptName, dr.day, dr.day_type, dr.shift_code
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
    ) as Record<string, unknown>[];

    const empMap3 = new Map<string, Record<string, unknown>>();
    for (const r of rows3) {
      const k = String(r.code);
      if (!empMap3.has(k)) empMap3.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '' });
      empMap3.get(k)![`d${r.day}`] = Number(r.day_type);
      empMap3.get(k)![`s${r.day}`] = String(r.shift_code ?? '');
    }
    const empArr3 = Array.from(empMap3.values());
    const FIXED3 = 4;
    const header3 = ['STT', 'Mã NV', 'Họ và tên', 'Phòng ban', ...days.map(d => String(d)), 'C1', 'C2', 'C'];
    const dowRow3 = ['', '', '', '', ...dowIdx.map(i => i >= 0 ? DOW_SHORT[i] : ''), '', '', ''];
    const data3 = empArr3.map((r, idx) => {
      const vals = days.map(d => {
        const dt = r[`d${d}`] as number ?? -1;
        const sc = r[`s${d}`] as string ?? '';
        return dt === 0 ? (sc || 'X') : (dt >= 0 ? (DT_LABEL[dt] ?? '') : '');
      });
      return [idx + 1, r.code, r.name, r.deptName, ...vals,
        vals.filter(v => v === 'C1').length, vals.filter(v => v === 'C2').length, vals.filter(v => v === 'C').length];
    });
    const ws3 = XLSX.utils.aoa_to_sheet([header3, dowRow3, ...data3]);
    applyStyles(ws3, header3.length, FIXED3, daysInMonth, dowIdx, 2, 1, -1, empArr3.length,
      (ri, di) => empArr3[ri][`d${days[di]}`] as number ?? -1);
    ws3['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, ...Array(daysInMonth).fill({ wch: 4.5 }), { wch: 6 }, { wch: 6 }, { wch: 6 }];
    ws3['!rows'] = [{ hpt: 28 }, { hpt: 14 }];
    ws3['!freeze'] = { xSplit: FIXED3, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws3, 'Buoc3_ChiaCa');

    // ── SHEET 4: Tăng ca / Đi trễ ───────────────────────────────────────────
    const rows4 = await conn.all(
      `SELECT e.code, e.name, d.name AS deptName, e.overtime_hours, e.late_minutes,
              dr.day, dr.day_type, dr.ot_hours, dr.late_mins
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
    ) as Record<string, unknown>[];

    const empMap4 = new Map<string, Record<string, unknown>>();
    for (const r of rows4) {
      const k = String(r.code);
      if (!empMap4.has(k)) empMap4.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', overtimeHours: r.overtime_hours ? parseFloat(String(r.overtime_hours)) : '', lateMinutes: r.late_minutes ? parseFloat(String(r.late_minutes)) : '', totalOt: 0, totalLate: 0 });
      const ot = Number(r.ot_hours) || 0;
      const late = Number(r.late_mins) || 0;
      empMap4.get(k)![`dt${r.day}`] = Number(r.day_type);
      empMap4.get(k)![`ot${r.day}`] = ot;
      empMap4.get(k)![`late${r.day}`] = late;
      empMap4.get(k)!.totalOt = Number(empMap4.get(k)!.totalOt) + ot;
      empMap4.get(k)!.totalLate = Number(empMap4.get(k)!.totalLate) + late;
    }
    const empArr4 = Array.from(empMap4.values());
    const FIXED4 = 4;
    const header4 = ['STT', 'MÃ NV', 'TÊN NHÂN VIÊN', 'PHÒNG BAN', ...days.map(d => String(d)), 'TĂNG CA (H)', 'GIỜ TRỄ (PH)', 'PHÂN BỔ TC (H)', 'PHÂN BỔ GT (PH)'];
    const dowRow4 = ['', '', '', '', ...dowIdx.map(i => i >= 0 ? DOW_SHORT[i] : ''), '', '', '', ''];
    const data4 = empArr4.map((r, idx) => {
      const vals = days.map(d => {
        const dt = Number(r[`dt${d}`] ?? -1);
        const ot = Number(r[`ot${d}`]) || 0;
        const late = Number(r[`late${d}`]) || 0;
        if (dt === 0) {
          const otR = ot > 0 ? ot : 0;
          const lateR = late > 0 ? late : 0;
          if (otR > 0 && lateR > 0) return `${otR}/${lateR}`;
          if (otR > 0) return otR;
          if (lateR > 0) return lateR;
          return 'X';
        }
        return dt >= 0 ? (DT_LABEL[dt] ?? '') : '';
      });
      const totalOt = Number(r.totalOt);
      const totalLate = Number(r.totalLate);
      return [idx + 1, r.code, r.name, r.deptName, ...vals,
        r.overtimeHours || '', r.lateMinutes || '',
        totalOt > 0 ? totalOt : '', totalLate > 0 ? totalLate : ''];
    });
    const ws4 = XLSX.utils.aoa_to_sheet([header4, dowRow4, ...data4]);
    applyStyles(ws4, header4.length, FIXED4, daysInMonth, dowIdx, 2, 1, -1, empArr4.length,
      (ri, di) => empArr4[ri][`dt${days[di]}`] as number ?? -1);
    for (let ri = 0; ri < empArr4.length; ri++) {
      for (let di = 0; di < daysInMonth; di++) {
        if (Number(empArr4[ri][`dt${days[di]}`] ?? -1) !== 0) continue;
        const ot = Number(empArr4[ri][`ot${days[di]}`]) || 0;
        const late = Number(empArr4[ri][`late${days[di]}`]) || 0;
        if (ot <= 0 && late <= 0) continue;
        const addr = encodeCell(ri + 2, FIXED4 + di);
        const bg = ot > 0 && late > 0 ? 'F5F3FF' : ot > 0 ? 'EFF6FF' : 'FFF7ED';
        const clr = ot > 0 && late > 0 ? '6D28D9' : ot > 0 ? '1D4ED8' : 'C2410C';
        (ws4 as any)[addr].s = { ...(ws4 as any)[addr].s, font: { bold: true, sz: 9, color: { rgb: clr } }, fill: { fgColor: { rgb: bg } } };
      }
    }
    ws4['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, ...Array(daysInMonth).fill({ wch: 4.5 }), { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }];
    ws4['!rows'] = [{ hpt: 28 }, { hpt: 14 }];
    ws4['!freeze'] = { xSplit: FIXED4, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws4, 'Buoc4_OT_DiTre');


    // ── SHEET 5: Giờ vào/ra ──────────────────────────────────────────────────
    const rows5 = await conn.all(
      `SELECT e.code, e.name, d.name AS deptName,
              e.special_group AS specialGroup, sg.name AS specialGroupName,
              e.group_code_end_date AS groupCodeEndDate,
              dr.day, dr.day_type, dr.check_in, dr.check_out, dr.shift_code
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN special_groups sg ON UPPER(sg.code) = UPPER(e.special_group) AND sg.month_id = e.month_id AND e.special_group <> ''
       WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
    ) as Record<string, unknown>[];

    const empMap5 = new Map<string, Record<string, unknown>>();
    for (const r of rows5) {
      const k = String(r.code);
      if (!empMap5.has(k)) empMap5.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', specialGroupName: r.specialGroupName || r.specialGroup || '', groupCodeEndDate: r.groupCodeEndDate ?? '' });
      const dt = Number(r.day_type);
      const sc = String(r.shift_code ?? '');
      if (dt === 0) {
        empMap5.get(k)![`in${r.day}`] = String(r.check_in ?? '') || '00:00';
        empMap5.get(k)![`out${r.day}`] = String(r.check_out ?? '') || '00:00';
        empMap5.get(k)![`ca${r.day}`] = sc === 'C' ? 'C' : (sc.match(/\d+/)?.[0] ?? '');
      } else {
        const sym = DT_LABEL[dt] ?? '';
        empMap5.get(k)![`in${r.day}`] = sym;
        empMap5.get(k)![`out${r.day}`] = sym;
        empMap5.get(k)![`ca${r.day}`] = '';
      }
      empMap5.get(k)![`dt${r.day}`] = dt;
    }
    const empArr5 = Array.from(empMap5.values());
    const FIXED5 = 6;
    const header5 = ['STT', 'MÃ NV', 'TÊN NHÂN VIÊN', 'PHÒNG BAN', 'NHÓM ĐẶC THÙ', 'NGÀY KẾT THÚC', ...days.flatMap(d => [d, d])];
    const dowRow5 = ['', '', '', '', '', '', ...days.flatMap(d => { const l = dowIdx[d - 1] >= 0 ? DOW_SHORT[dowIdx[d - 1]] : ''; return [l, l]; })];
    const inOutRow5 = ['', '', '', '', '', '', ...days.flatMap(() => ['In', 'Out'])];
    const data5 = empArr5.map((r, idx) => [
      idx + 1, r.code, r.name, r.deptName,
      String(r.specialGroupName || r.specialGroup || ''),
      String(r.groupCodeEndDate || ''),
      ...days.flatMap(d => [r[`in${d}`] ?? '', r[`out${d}`] ?? '']),
    ]);
    const ws5 = XLSX.utils.aoa_to_sheet([header5, dowRow5, inOutRow5, ...data5]);
    applyStyles(ws5, header5.length, FIXED5, daysInMonth, dowIdx, 3, 1, 2, empArr5.length,
      (ri, di) => empArr5[ri][`dt${days[di]}`] as number ?? -1, 2);
    ws5['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, ...Array(daysInMonth * 2).fill({ wch: 7 })];
    ws5['!rows'] = [{ hpt: 28 }, { hpt: 14 }, { hpt: 14 }];
    ws5['!freeze'] = { xSplit: FIXED5, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws5, 'Buoc5_GioVaoRa');

    // ── SHEET 6: Kết quả tổng hợp ────────────────────────────────────────────
    const [mm, yyyy] = (monthRow?.month ?? '01/2026').split('/').map(Number);
    const rows6 = await conn.all(
      `SELECT e.code, e.name, d.name AS deptName,
              e.special_group AS specialGroup, sg.name AS specialGroupName,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              e.workdays,
              dr.day, dr.day_type, dr.check_in, dr.check_out, dr.ot_hours, dr.late_mins
       FROM distribution_results dr
       JOIN employees e ON dr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN special_groups sg ON UPPER(sg.code) = UPPER(e.special_group) AND sg.month_id = e.month_id AND e.special_group <> ''
       WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
    ) as Record<string, unknown>[];

    const empMap6 = new Map<string, Record<string, unknown>>();
    for (const r of rows6) {
      const k = String(r.code);
      if (!empMap6.has(k)) empMap6.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', specialGroupName: r.specialGroupName || r.specialGroup || '', ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '', workdays: r.workdays ?? '', totalLP: 0, totalPN: 0, totalOT: 0, totalLate: 0, _nghiCuoi: '' });
      const dt = Number(r.day_type);
      const emp = empMap6.get(k)!;
      emp[`dt${r.day}`] = dt;
      if (dt === 0) {
        emp[`in${r.day}`] = r.check_in || '00:00';
        emp[`out${r.day}`] = r.check_out || '00:00';
        emp.totalOT = Number(emp.totalOT) + (Number(r.ot_hours) || 0);
        emp.totalLate = Number(emp.totalLate) + (Number(r.late_mins) || 0);
      } else {
        const sym = DT_LABEL[dt] ?? '';
        emp[`in${r.day}`] = sym; emp[`out${r.day}`] = sym;
        if (dt === 1) emp.totalLP = Number(emp.totalLP) + 1;
        if (dt === 2) emp.totalPN = Number(emp.totalPN) + 1;
      }
    }
    // Compute _nghiCuoi (last non-X day)
    for (const emp of empMap6.values()) {
      for (let d = daysInMonth; d >= 1; d--) {
        const dt = emp[`dt${d}`] as number ?? -1;
        if (dt >= 0 && dt !== 0) { emp._nghiCuoi = `${String(d).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`; break; }
      }
    }
    const empArr6 = Array.from(empMap6.values());
    const FIXED6 = 7;
    const SUMMARY = ['NGÀY CÔNG', 'LP', 'PN', 'TĂNG CA(H)', 'TRỄ(PH)', 'NGHỈ CUỐI THÁNG NÀY'];
    const row0 = ['STT', 'MÃ NV', 'TÊN NHÂN VIÊN', 'PHÒNG BAN', 'NHÓM ĐẶC THÙ', 'NGHỈ THÁNG TRƯỚC', ...days.flatMap(d => [d, d]), ...SUMMARY];
    const row1 = ['', '', '', '', '', '', ...days.flatMap(d => { const l = dowIdx[d - 1] >= 0 ? DOW_SHORT[dowIdx[d - 1]] : ''; return [l, l]; }), ...Array(SUMMARY.length).fill('')];
    const row2 = ['', '', '', '', '', '', ...days.flatMap(() => ['In', 'Out']), ...Array(SUMMARY.length).fill('')];
    const dataRows6 = empArr6.map((r, idx) => [
      idx + 1, r.code, r.name, r.deptName, r.specialGroupName, fmtDate(String(r.ngayNghiCuoiThangTruoc ?? '')),
      ...days.flatMap(d => [r[`in${d}`] ?? '', r[`out${d}`] ?? '']),
      r.workdays != null ? Math.round(Number(r.workdays)) : '', r.totalLP, r.totalPN,
      Number(r.totalOT) > 0 ? Math.round(Number(r.totalOT)) : '',
      Number(r.totalLate) > 0 ? Math.round(Number(r.totalLate)) : '',
      String(r._nghiCuoi || ''),
    ]);
    const ws6 = XLSX.utils.aoa_to_sheet([row0, row1, row2, ...dataRows6]);
    const merges = [];
    for (let c = 0; c < FIXED6; c++) merges.push({ s: { r: 0, c }, e: { r: 2, c } });
    for (let i = 0; i < daysInMonth; i++) {
      const c = FIXED6 + i * 2;
      merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 1 } });
      merges.push({ s: { r: 1, c }, e: { r: 1, c: c + 1 } });
    }
    const sumStart = FIXED6 + daysInMonth * 2;
    for (let i = 0; i < SUMMARY.length; i++) merges.push({ s: { r: 0, c: sumStart + i }, e: { r: 2, c: sumStart + i } });
    ws6['!merges'] = merges;
    applyStyles(ws6, FIXED6 + daysInMonth * 2 + SUMMARY.length, FIXED6, daysInMonth, dowIdx, 3, 1, 2, empArr6.length,
      (ri, di) => empArr6[ri][`dt${days[di]}`] as number ?? -1, 2);
    ws6['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, ...Array(daysInMonth * 2).fill({ wch: 7 }), { wch: 11 }, { wch: 6 }, { wch: 6 }, { wch: 11 }, { wch: 9 }, { wch: 16 }];
    ws6['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 15 }];
    ws6['!freeze'] = { xSplit: FIXED6, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws6, 'Buoc6_KetQua');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    await conn.close();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`${monthLabel}_bao_cao_chi_tiet_phan_bo_${today}.xlsx`)}"`,
      },
    });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
