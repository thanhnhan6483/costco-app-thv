import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

const DT_LABEL: Record<number, string> = {
  0: 'X', 1: 'LP', 2: 'PN', 3: 'Ô', 4: 'TS', 5: 'DS', 6: 'O', 7: 'NL', 8: 'OF', 9: 'P',
  10: 'X/2', 11: 'LL', 12: 'LN', 13: 'H', 14: 'B',
};

// ── Shared style constants ──────────────────────────────────────────────────
const DT_BG: Record<number, string> = {
  0: 'F0FDF4', 1: 'F1F5F9', 2: 'F5F3FF', 3: 'FEF2F2', 4: 'FDF2F8',
  5: 'F0FDFA', 6: 'FFF7ED', 7: 'EFF6FF', 8: 'F8FAFC', 9: 'ECFEFF',
};
const DT_CLR: Record<number, string> = {
  0: '15803D', 1: '475569', 2: '6D28D9', 3: 'B91C1C', 4: 'BE185D',
  5: '0F766E', 6: 'C2410C', 7: '1D4ED8', 8: '4B5563', 9: '0E7490',
};
const BORDER = {
  top: { style: 'thin', color: { rgb: 'E2E8F0' } },
  bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
  left: { style: 'thin', color: { rgb: 'E2E8F0' } },
  right: { style: 'thin', color: { rgb: 'E2E8F0' } },
};
const BORDER_DARK = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};
const HDR_STYLE = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER_DARK };
const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function fmtDate(v: string): string {
  if (!v) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) { const [y, m, d] = v.slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
  return v;
}

/** Compute dow index (0=Sun) per day; -1 if out of month */
function buildDowIdx(fromDate: string | undefined, days: number[]): number[] {
  if (!fromDate) return days.map(() => -1);
  const [, mm, yyyy] = fromDate.split('/').map(Number);
  return days.map(d => {
    const date = new Date(yyyy, mm - 1, d);
    return date.getMonth() === mm - 1 ? date.getDay() : -1;
  });
}

function applyStyles(
  ws: Record<string, unknown>,
  totalCols: number,
  fixedCols: number,
  daysInMonth: number,
  dowIdx: number[],
  headerRowCount: number,
  dowRowIdx: number,
  inOutRowIdx: number,
  totalDataRows: number,
  getDayType: (ri: number, di: number) => number,
  colsPerDay = 1,
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

function encodeCell(r: number, c: number): string {
  const col = c < 26 ? String.fromCharCode(65 + c) : String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26));
  return `${col}${r + 1}`;
}

function makeResponse(buf: Buffer, fileName: string) {
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}


export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const monthId = url.searchParams.get('month') ?? '';
  const step = Number(url.searchParams.get('step') ?? '2');
  const withShift = url.searchParams.get('withShift') === '1';
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const { daysInMonth } = await loadMonthInfo(monthId);
    const XLSX = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const [monthRow] = await conn.all<{ fromDate: string; month: string }>(
      `SELECT from_date AS fromDate, month FROM months WHERE id = ?`, monthId
    );
    const monthLabel = monthRow?.month ? 'Thang_' + monthRow.month.replace('/', '') : monthId;
    const dowIdx = buildDowIdx(monthRow?.fromDate, days);

    // ── STEP 1 ──────────────────────────────────────────────────────────────
    if (step === 1) {
      const rows = await conn.all(
        `SELECT e.code, e.name,
                COALESCE(d1.name, d2.name) AS deptName,
                ${days.map(d => `e.day_${d}`).join(', ')},
                e.workdays, e.overtime_hours, e.late_minutes, e.phep_nam
         FROM employees e
         LEFT JOIN departments d1 ON d1.id = e.department_id AND d1.month_id = e.month_id AND e.department_id <> ''
         LEFT JOIN departments d2 ON UPPER(d2.code) = UPPER(e.ma_pb) AND d2.month_id = e.month_id AND e.ma_pb <> ''
         WHERE e.month_id = ? AND e.active = TRUE ORDER BY e.code`, monthId
      ) as Record<string, unknown>[];

      // Store raw day_type per row for coloring
      const FIXED = 3; // Mã NV, Tên, Phòng ban (no STT in step1)
      const header1 = ['Mã NV', 'Tên', 'Phòng ban', ...days.map(d => String(d)), 'Ngày công', 'Tăng ca (H)', 'Trễ (ph)', 'Phép năm'];
      const dowRow1 = ['', '', '', ...dowIdx.map(i => i >= 0 ? DOW_SHORT[i] : ''), '', '', '', ''];
      const data1 = rows.map(r => [
        r.code, r.name, r.deptName ?? '',
        ...days.map(d => r[`day_${d}`] ?? ''),
        r.workdays != null ? Math.round(Number(r.workdays)) : '',
        r.overtime_hours != null ? Math.round(Number(r.overtime_hours)) : '',
        r.late_minutes != null ? Math.round(Number(r.late_minutes)) : '',
        r.phep_nam != null ? Math.round(Number(r.phep_nam)) : '',
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet([header1, dowRow1, ...data1]);
      const totalCols1 = header1.length;
      // Map symbol → dt for coloring
      const SYM_DT: Record<string, number> = { X: 0, LP: 1, PN: 2, Ô: 3, TS: 4, DS: 5, O: 6, NL: 7, OF: 8, P: 9 };
      applyStyles(ws1, totalCols1, FIXED, daysInMonth, dowIdx, 2, 1, -1, rows.length,
        (ri, di) => SYM_DT[String(rows[ri][`day_${days[di]}`] ?? '')] ?? -1);
      ws1['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 12 }, ...Array(daysInMonth).fill({ wch: 4.5 }), { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 9 }];
      ws1['!rows'] = [{ hpt: 28 }, { hpt: 14 }];
      ws1['!freeze'] = { xSplit: FIXED, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws1, 'Buoc1_DuLieu');
      const buf1 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
      await conn.close();
      return makeResponse(buf1, `${monthLabel}_bcc_buoc1_du_lieu_${today}.xlsx`);
    }

    // ── STEP 2 ──────────────────────────────────────────────────────────────
    if (step === 2) {
      const rows = await conn.all(
        `SELECT e.code, e.name, d.name AS deptName,
                e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
                e.phep_nam AS phepNam, dr.day, dr.day_type
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
      ) as Record<string, unknown>[];

      const empMap = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        const k = String(r.code);
        if (!empMap.has(k)) empMap.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc ?? '', phepNam: r.phepNam ?? '' });
        empMap.get(k)![`d${r.day}`] = Number(r.day_type);
      }
      const empArr = Array.from(empMap.values());
      const FIXED = 5; // STT, Mã NV, Họ và tên, Phòng ban, NGHỈ THÁNG TRƯỚC
      const header2 = ['STT', 'Mã NV', 'Họ và tên', 'Phòng ban', 'NGHỈ THÁNG TRƯỚC', ...days.map(d => String(d)), 'NGÀY CÔNG', 'PHÉP NĂM', 'LP', 'PN'];
      const dowRow2 = ['', '', '', '', '', ...dowIdx.map(i => i >= 0 ? DOW_SHORT[i] : ''), '', '', '', ''];
      const data2 = empArr.map((r, idx) => {
        const dts = days.map(d => r[`d${d}`] as number ?? -1);
        return [idx + 1, r.code, r.name, r.deptName, fmtDate(String(r.ngayNghiCuoiThangTruoc ?? '')), ...dts.map(dt => dt >= 0 ? (DT_LABEL[dt] ?? '') : ''),
          dts.filter(v => v === 0).length, r.phepNam, dts.filter(v => v === 1).length, dts.filter(v => v === 2).length];
      });

      const ws2 = XLSX.utils.aoa_to_sheet([header2, dowRow2, ...data2]);
      applyStyles(ws2, header2.length, FIXED, daysInMonth, dowIdx, 2, 1, -1, empArr.length,
        (ri, di) => empArr[ri][`d${days[di]}`] as number ?? -1);
      ws2['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, ...Array(daysInMonth).fill({ wch: 4.5 }), { wch: 10 }, { wch: 9 }, { wch: 6 }, { wch: 6 }];
      ws2['!rows'] = [{ hpt: 28 }, { hpt: 14 }];
      ws2['!freeze'] = { xSplit: FIXED, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws2, 'Attendance');
      const buf2 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
      await conn.close();
      return makeResponse(buf2, `buoc2_ngay_cong_${today}.xlsx`);
    }


    // ── STEP 3 ──────────────────────────────────────────────────────────────
    if (step === 3) {
      const rows = await conn.all(
        `SELECT e.code, e.name, d.name AS deptName, dr.day, dr.day_type, dr.shift_code
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
      ) as Record<string, unknown>[];

      const empMap = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        const k = String(r.code);
        if (!empMap.has(k)) empMap.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '' });
        const dt = Number(r.day_type);
        empMap.get(k)![`d${r.day}`] = dt;
        empMap.get(k)![`s${r.day}`] = String(r.shift_code ?? '');
      }
      const empArr = Array.from(empMap.values());
      const FIXED = 4;
      const header3 = ['STT', 'Mã NV', 'Họ và tên', 'Phòng ban', ...days.map(d => String(d)), 'C1', 'C2', 'C'];
      const dowRow3 = ['', '', '', '', ...dowIdx.map(i => i >= 0 ? DOW_SHORT[i] : ''), '', '', ''];
      const data3 = empArr.map((r, idx) => {
        const vals = days.map(d => {
          const dt = r[`d${d}`] as number ?? -1;
          const sc = r[`s${d}`] as string ?? '';
          return dt === 0 ? (sc || 'X') : (dt >= 0 ? (DT_LABEL[dt] ?? '') : '');
        });
        return [idx + 1, r.code, r.name, r.deptName, ...vals,
          vals.filter(v => v === 'C1').length, vals.filter(v => v === 'C2').length, vals.filter(v => v === 'C').length];
      });

      const ws3 = XLSX.utils.aoa_to_sheet([header3, dowRow3, ...data3]);
      // For shift cells: color by day_type (0=X stays green, others by type)
      applyStyles(ws3, header3.length, FIXED, daysInMonth, dowIdx, 2, 1, -1, empArr.length,
        (ri, di) => empArr[ri][`d${days[di]}`] as number ?? -1);
      ws3['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, ...Array(daysInMonth).fill({ wch: 4.5 }), { wch: 6 }, { wch: 6 }, { wch: 6 }];
      ws3['!rows'] = [{ hpt: 28 }, { hpt: 14 }];
      ws3['!freeze'] = { xSplit: FIXED, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws3, 'ChiaCa');
      const buf3 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
      await conn.close();
      return makeResponse(buf3, `${monthLabel}_bcc_buoc3_chia_ca_${today}.xlsx`);
    }

    // ── STEP 4 ──────────────────────────────────────────────────────────────
    if (step === 4) {
      const rows4 = await conn.all(
        `SELECT e.code, e.name, d.name AS deptName, e.overtime_hours, e.late_minutes, dr.day, dr.day_type, dr.ot_hours, dr.late_mins
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
      ) as Record<string, unknown>[];

      const empMap = new Map<string, Record<string, unknown>>();
      for (const r of rows4) {
        const k = String(r.code);
        if (!empMap.has(k)) empMap.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', overtimeHours: r.overtime_hours ?? '', lateMinutes: r.late_minutes ?? '', totalOt: 0, totalLate: 0 });
        const dt = Number(r.day_type);
        const ot = Number(r.ot_hours) || 0;
        const late = Number(r.late_mins) || 0;
        empMap.get(k)![`dt${r.day}`] = dt;
        empMap.get(k)![`ot${r.day}`] = ot;
        empMap.get(k)![`late${r.day}`] = late;
        empMap.get(k)!.totalOt = Number(empMap.get(k)!.totalOt) + ot;
        empMap.get(k)!.totalLate = Number(empMap.get(k)!.totalLate) + late;
      }
      const empArr = Array.from(empMap.values());
      const FIXED = 6;
      const header4 = ['STT', 'Mã NV', 'HỌ VÀ TÊN', 'PHÒNG BAN', 'TĂNG CA (H)', 'GIỜ TRỄ (PH)', ...days.map(d => String(d)), 'PHÂN BỔ TC (H)', 'PHÂN BỔ GT (PH)'];
      const dowRow4 = ['', '', '', '', '', '', ...dowIdx.map(i => i >= 0 ? DOW_SHORT[i] : ''), '', ''];
      const data4 = empArr.map((r, idx) => {
        const vals = days.map(d => {
          const dt = Number(r[`dt${d}`] ?? -1);
          const ot = Number(r[`ot${d}`]) || 0;
          const late = Number(r[`late${d}`]) || 0;
          if (dt === 0) {
            const otR = ot > 0 ? Math.round(ot) : 0;
            const lateR = late > 0 ? Math.round(late) : 0;
            if (otR > 0 && lateR > 0) return `${otR}/${lateR}`;
            if (otR > 0) return otR;
            if (lateR > 0) return lateR;
            return 'X';
          }
          return dt >= 0 ? (DT_LABEL[dt] ?? '') : '';
        });
        const totalOt = Math.round(Number(r.totalOt));
        const totalLate = Math.round(Number(r.totalLate));
        return [idx + 1, r.code, r.name, r.deptName, r.overtimeHours || '', r.lateMinutes || '', ...vals, totalOt > 0 ? totalOt : '', totalLate > 0 ? totalLate : ''];
      });

      const ws4 = XLSX.utils.aoa_to_sheet([header4, dowRow4, ...data4]);
      applyStyles(ws4, header4.length, FIXED, daysInMonth, dowIdx, 2, 1, -1, empArr.length,
        (ri, di) => empArr[ri][`dt${days[di]}`] as number ?? -1);
      // Override màu ô OT/Late (khớp website)
      for (let ri = 0; ri < empArr.length; ri++) {
        const r = empArr[ri];
        for (let di = 0; di < daysInMonth; di++) {
          const dt = Number(r[`dt${days[di]}`] ?? -1);
          if (dt !== 0) continue;
          const ot = Number(r[`ot${days[di]}`]) || 0;
          const late = Number(r[`late${days[di]}`]) || 0;
          if (ot <= 0 && late <= 0) continue;
          const addr = encodeCell(ri + 2, FIXED + di);
          const bg = ot > 0 && late > 0 ? 'F5F3FF' : ot > 0 ? 'EFF6FF' : 'FFF7ED';
          const clr = ot > 0 && late > 0 ? '6D28D9' : ot > 0 ? '1D4ED8' : 'C2410C';
          (ws4 as any)[addr].s = { ...(ws4 as any)[addr].s, font: { bold: true, sz: 9, color: { rgb: clr } }, fill: { fgColor: { rgb: bg } } };
        }
      }
      ws4['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 6 }, { wch: 6 }, ...Array(daysInMonth).fill({ wch: 4.5 }), { wch: 10 }, { wch: 8 }];
      ws4['!rows'] = [{ hpt: 28 }, { hpt: 14 }];
      ws4['!freeze'] = { xSplit: FIXED, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws4, 'OT_DiTre');
      const buf4 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
      await conn.close();
      return makeResponse(buf4, `${monthLabel}_bcc_buoc4_ot_tre_${today}.xlsx`);
    }


    // ── STEP 5 ──────────────────────────────────────────────────────────────
    if (step === 5) {
      const rows5 = await conn.all(
        `SELECT e.code, e.name, d.name AS deptName, dr.day, dr.day_type, dr.check_in, dr.check_out, dr.shift_code
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
      ) as Record<string, unknown>[];

      const empMap = new Map<string, Record<string, unknown>>();
      for (const r of rows5) {
        const k = String(r.code);
        if (!empMap.has(k)) empMap.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '' });
        const dt = Number(r.day_type);
        const sc = String(r.shift_code ?? '');
        if (dt === 0) {
          empMap.get(k)![`in${r.day}`] = String(r.check_in ?? '') || '00:00';
          empMap.get(k)![`out${r.day}`] = String(r.check_out ?? '') || '00:00';
          empMap.get(k)![`ca${r.day}`] = sc === 'C' ? 'C' : (sc.match(/\d+/)?.[0] ?? '');
        } else {
          const sym = DT_LABEL[dt] ?? '';
          empMap.get(k)![`in${r.day}`] = sym;
          empMap.get(k)![`out${r.day}`] = sym;
          empMap.get(k)![`ca${r.day}`] = '';
        }
        empMap.get(k)![`dt${r.day}`] = dt;
      }
      const empArr = Array.from(empMap.values());
      const cols = withShift ? 3 : 2;
      const FIXED = 4;

      const header5 = ['STT', 'Mã NV', 'Tên nhân viên', 'Phòng ban', ...days.flatMap(d => Array(cols).fill(d))];
      const dowRow5 = ['', '', '', '', ...days.flatMap(d => {
        const di = d - 1;
        const label = dowIdx[di] >= 0 ? DOW_SHORT[dowIdx[di]] : '';
        return Array(cols).fill(label);
      })];
      const inOutRow5 = ['', '', '', '', ...days.flatMap(() => withShift ? ['In', 'Out', 'Ca'] : ['In', 'Out'])];
      const data5 = empArr.map((r, idx) => [
        idx + 1, r.code, r.name, r.deptName,
        ...days.flatMap(d => withShift ? [r[`in${d}`] ?? '', r[`out${d}`] ?? '', r[`ca${d}`] ?? ''] : [r[`in${d}`] ?? '', r[`out${d}`] ?? '']),
      ]);

      const ws5 = XLSX.utils.aoa_to_sheet([header5, dowRow5, inOutRow5, ...data5]);
      const totalCols5 = header5.length;
      applyStyles(ws5, totalCols5, FIXED, daysInMonth, dowIdx, 3, 1, 2, empArr.length,
        (ri, di) => empArr[ri][`dt${days[di]}`] as number ?? -1, cols);
      ws5['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, ...Array(daysInMonth * cols).fill({ wch: 7 })];
      ws5['!rows'] = [{ hpt: 28 }, { hpt: 14 }, { hpt: 14 }];
      ws5['!freeze'] = { xSplit: FIXED, ySplit: 1 };
      const fileName5 = withShift ? `${monthLabel}_bcc_buoc5_gio_vao_ra_ca_${today}.xlsx` : `${monthLabel}_bcc_buoc5_gio_vao_ra_${today}.xlsx`;
      XLSX.utils.book_append_sheet(wb, ws5, 'Attendance');
      const buf5 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
      await conn.close();
      return makeResponse(buf5, fileName5);
    }
    // ── STEP 6 ──────────────────────────────────────────────────────────────
    {
      const rows6 = await conn.all(
        `SELECT e.code, e.name,
                COALESCE(d1.name, d2.name) AS deptName,
                e.special_group AS nhom,
                e.ngay_nghi_cuoi_thang_truoc AS ngayNghi,
                e.workdays,
                dr.day, dr.day_type, dr.check_in, dr.check_out, dr.ot_hours, dr.late_mins
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d1 ON d1.id = e.department_id AND d1.month_id = e.month_id AND e.department_id <> ''
         LEFT JOIN departments d2 ON UPPER(d2.code) = UPPER(e.ma_pb) AND d2.month_id = e.month_id AND e.ma_pb <> ''
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
      ) as Record<string, unknown>[];

      const empMap = new Map<string, Record<string, unknown>>();
      for (const r of rows6) {
        const k = String(r.code);
        if (!empMap.has(k)) empMap.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', nhom: r.nhom ?? '', ngayNghi: r.ngayNghi ?? '', workdays: r.workdays ?? '', totalLP: 0, totalPN: 0, totalOT: 0, totalLate: 0 });
        const dt = Number(r.day_type);
        const emp = empMap.get(k)!;
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
      const empArr = Array.from(empMap.values());
      const FIXED = 6;
      const SUMMARY = ['NGÀY CÔNG', 'LP', 'PN', 'TĂNG CA(H)', 'TRỄ(PH)'];

      const row0 = ['STT', 'Mã NV', 'Tên nhân viên', 'Phòng ban', 'Nhóm', 'Ngày nghỉ của tháng', ...days.flatMap(d => [d, d]), ...SUMMARY];
      const row1 = ['', '', '', '', '', '', ...days.flatMap(d => { const i = d - 1; const l = dowIdx[i] >= 0 ? DOW_SHORT[dowIdx[i]] : ''; return [l, l]; }), ...Array(SUMMARY.length).fill('')];
      const row2 = ['', '', '', '', '', '', ...days.flatMap(() => ['In', 'Out']), ...Array(SUMMARY.length).fill('')];
      const dataRows6 = empArr.map((r, idx) => [
        idx + 1, r.code, r.name, r.deptName, r.nhom, fmtDate(String(r.ngayNghi ?? '')),
        ...days.flatMap(d => [r[`in${d}`] ?? '', r[`out${d}`] ?? '']),
        r.workdays != null ? Math.round(Number(r.workdays)) : '', r.totalLP, r.totalPN,
        Number(r.totalOT) > 0 ? Math.round(Number(r.totalOT)) : '', Number(r.totalLate) > 0 ? Math.round(Number(r.totalLate)) : '',
      ]);

      const ws6 = XLSX.utils.aoa_to_sheet([row0, row1, row2, ...dataRows6]);

      // Merges
      const merges = [];
      for (let c = 0; c < FIXED; c++) merges.push({ s: { r: 0, c }, e: { r: 2, c } });
      for (let i = 0; i < daysInMonth; i++) {
        const c = FIXED + i * 2;
        merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 1 } });
        merges.push({ s: { r: 1, c }, e: { r: 1, c: c + 1 } });
      }
      const sumStart = FIXED + daysInMonth * 2;
      for (let i = 0; i < SUMMARY.length; i++) merges.push({ s: { r: 0, c: sumStart + i }, e: { r: 2, c: sumStart + i } });
      ws6['!merges'] = merges;

      const totalCols6 = FIXED + daysInMonth * 2 + SUMMARY.length;
      applyStyles(ws6, totalCols6, FIXED, daysInMonth, dowIdx, 3, 1, 2, empArr.length,
        (ri, di) => empArr[ri][`dt${days[di]}`] as number ?? -1, 2);
      ws6['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, ...Array(daysInMonth * 2).fill({ wch: 7 }), { wch: 11 }, { wch: 6 }, { wch: 6 }, { wch: 11 }, { wch: 9 }];
      ws6['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 15 }];
      ws6['!freeze'] = { xSplit: FIXED, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws6, 'Attendance');
      const buf6 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
      await conn.close();
      return makeResponse(buf6, `${monthLabel}_bang_cham_cong_tong_hop_${today}.xlsx`);
    }
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
