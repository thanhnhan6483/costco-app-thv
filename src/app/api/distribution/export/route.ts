import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

const DT_LABEL: Record<number, string> = {
  0: 'X', 1: 'LP', 2: 'PN', 3: 'Ô', 4: 'TS', 5: 'DS', 6: 'O', 7: 'NL', 8: 'OF', 9: 'P',
  10: 'X/2', 11: 'LL', 12: 'LN', 13: 'H', 14: 'B',
};

/**
 * GET /api/distribution/export?month=&step=
 * step: 1=Xem dữ liệu, 2=Phân bổ ngày công, 3=Chia ca, 4=OT&Trễ, 5=Giờ vào/ra, 6=Kết quả
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const monthId = url.searchParams.get('month') ?? '';
  const step = Number(url.searchParams.get('step') ?? '2');
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const { daysInMonth } = await loadMonthInfo(monthId);
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let header: string[] = [];
    let data: unknown[][] = [];
    let sheetName = 'Sheet1';
    let fileName = `buoc${step}_${today}.xlsx`;

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    if (step === 1) {
      // Bước 1: Xem dữ liệu nhân viên (từ bảng employees)
      sheetName = 'Buoc1_DuLieu';
      fileName = `buoc1_du_lieu_${today}.xlsx`;
      const rows = await conn.all(
        `SELECT e.code, e.name, d.name AS deptName, e.workdays, e.overtime_hours, e.late_minutes, e.phep_nam,
                e.ngay_nghi_cuoi_thang_truoc,
                ${days.map(d => `e.day_${d}`).join(', ')}
         FROM employees e LEFT JOIN departments d ON e.department_id = d.id
         WHERE e.month_id = ? AND e.active = TRUE ORDER BY e.code`, monthId
      ) as Record<string, unknown>[];
      header = ['Mã NV', 'Tên', 'Phòng ban', 'Công', 'OT(h)', 'Trễ(ph)', 'Phép năm', 'Nghỉ CTT',
        ...days.map(d => `Ngày ${d}`)];
      data = rows.map(r => [
        r.code, r.name, r.deptName ?? '', r.workdays ?? '', r.overtime_hours ?? '',
        r.late_minutes ?? '', r.phep_nam ?? '', r.ngay_nghi_cuoi_thang_truoc ?? '',
        ...days.map(d => r[`day_${d}`] ?? ''),
      ]);

    } else if (step === 2) {
      // Bước 2: Phân bổ ngày công
      sheetName = 'Buoc2_NgayCong';
      fileName = `buoc2_ngay_cong_${today}.xlsx`;
      const rows = await conn.all(
        `SELECT e.code, e.name, d.name AS deptName,
                dr.day, dr.day_type
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
      ) as Record<string, unknown>[];
      // Pivot
      const empMap = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        const k = String(r.code);
        if (!empMap.has(k)) empMap.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '' });
        empMap.get(k)![`d${r.day}`] = DT_LABEL[Number(r.day_type)] ?? '';
      }
      header = ['Mã NV', 'Tên', 'Phòng ban', ...days.map(d => String(d)),
        'Làm', 'Nghỉ', 'PN'];
      data = Array.from(empMap.values()).map(r => {
        const dayVals = days.map(d => r[`d${d}`] ?? '');
        const lam = dayVals.filter(v => v === 'X').length;
        const nghi = dayVals.filter(v => v === 'LP').length;
        const pn = dayVals.filter(v => v === 'PN').length;
        return [r.code, r.name, r.deptName, ...dayVals, lam, nghi, pn];
      });

    } else if (step === 3) {
      // Bước 3: Chia ca
      sheetName = 'Buoc3_ChiaCa';
      fileName = `buoc3_chia_ca_${today}.xlsx`;
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
        const sc = String(r.shift_code ?? '');
        empMap.get(k)![`d${r.day}`] = dt === 0 ? (sc || 'X') : (DT_LABEL[dt] ?? '');
      }
      header = ['Mã NV', 'Tên', 'Phòng ban', ...days.map(d => String(d)), 'Ca 1', 'Ca 2', 'C'];
      data = Array.from(empMap.values()).map(r => {
        const dayVals = days.map(d => String(r[`d${d}`] ?? ''));
        return [r.code, r.name, r.deptName, ...dayVals,
          dayVals.filter(v => v === 'Ca 1').length,
          dayVals.filter(v => v === 'Ca 2').length,
          dayVals.filter(v => v === 'C').length,
        ];
      });

    } else if (step === 4) {
      // Bước 4: OT & Đi trễ
      sheetName = 'Buoc4_OT_Tre';
      fileName = `buoc4_ot_tre_${today}.xlsx`;
      const rows = await conn.all(
        `SELECT e.code, e.name, d.name AS deptName, dr.day, dr.day_type, dr.ot_hours, dr.late_mins
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
      ) as Record<string, unknown>[];
      const empMap = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        const k = String(r.code);
        if (!empMap.has(k)) empMap.set(k, { code: r.code, name: r.name, deptName: r.deptName ?? '', totalOt: 0, totalLate: 0 });
        const ot = Number(r.ot_hours) || 0;
        const late = Number(r.late_mins) || 0;
        empMap.get(k)![`ot${r.day}`] = ot || '';
        empMap.get(k)![`late${r.day}`] = late || '';
        (empMap.get(k)!.totalOt as number) + ot;
        empMap.get(k)!.totalOt = Number(empMap.get(k)!.totalOt) + ot;
        empMap.get(k)!.totalLate = Number(empMap.get(k)!.totalLate) + late;
      }
      header = ['Mã NV', 'Tên', 'Phòng ban',
        ...days.map(d => `OT ${d}`), ...days.map(d => `Trễ ${d}`),
        'Tổng OT(h)', 'Tổng Trễ(ph)'];
      data = Array.from(empMap.values()).map(r => [
        r.code, r.name, r.deptName,
        ...days.map(d => r[`ot${d}`] ?? ''),
        ...days.map(d => r[`late${d}`] ?? ''),
        r.totalOt, r.totalLate,
      ]);

    } else {
      // Bước 5 & 6: Giờ vào/ra + Kết quả
      sheetName = step === 5 ? 'Buoc5_GioVaoRa' : 'Buoc6_KetQua';
      fileName = step === 5 ? `buoc5_gio_vao_ra_${today}.xlsx` : `buoc6_ket_qua_${today}.xlsx`;
      const rows = await conn.all(
        `SELECT e.code, e.name, d.name AS deptName,
                dr.day, dr.day_type, dr.shift_code, dr.check_in, dr.check_out, dr.ot_hours, dr.late_mins
         FROM distribution_results dr
         JOIN employees e ON dr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE dr.month_id = ? ORDER BY e.code, dr.day`, monthId
      ) as Record<string, unknown>[];
      // Flat format: 1 row per employee per day
      header = ['Mã NV', 'Tên', 'Phòng ban', 'Ngày', 'Loại ngày', 'Ca', 'Giờ vào', 'Giờ ra', 'OT(h)', 'Trễ(ph)'];
      data = rows.map(r => [
        r.code, r.name, r.deptName ?? '', r.day,
        DT_LABEL[Number(r.day_type)] ?? '',
        r.shift_code ?? '', r.check_in ?? '', r.check_out ?? '',
        Number(r.ot_hours) || '', Number(r.late_mins) || '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    // Bold header
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[addr]) ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } } };
    }
    // Col widths
    ws['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 18 }, ...Array(header.length - 3).fill({ wch: 8 })];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    await conn.close();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
