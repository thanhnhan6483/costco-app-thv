import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

const DAY_COLS = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`);
const SELECT_DAYS = DAY_COLS.map(c => `e.${c}`).join(', ');

function formatDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number' || !isNaN(Number(val))) {
    const num = Number(val);
    if (num > 59 && Number.isInteger(num)) {
      const d = new Date((num - 25569) * 86400000);
      if (!isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    }
  }
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

export async function GET(req: NextRequest) {
  try {
    const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    const rows = await conn.all(`
      SELECT e.code AS employee_code,
             e.name AS employee_name,
             COALESCE(d1.name, d2.name)           AS department_name,
             e.special_group                       AS group_code,
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

    const XLSX = await import('xlsx-js-style');
    const wb   = XLSX.utils.book_new();

    const header = [
      'employee_code', 'employee_name',
      'department_name',
      'group_code',
      'group_code_end_date', 'workdays',
      ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
      'overtime_hours', 'late_minutes', 'phep_nam', 'ngay_nghi_thang_truoc',
    ];

    const data = rows.map((r: Record<string, unknown>) => [
      r['employee_code'] ?? '',
      r['employee_name'] ?? '',
      r['department_name'] ?? '',
      r['group_code'] ?? '',
      formatDate(r['group_code_end_date']),
      r['workdays'] ?? '',
      ...Array.from({ length: 31 }, (_, i) => r[`day_${i + 1}`] ?? ''),
      r['overtime_hours'] ?? '',
      r['late_minutes'] ?? '',
      r['phep_nam'] ?? '',
      formatDate(r['ngay_nghi_cuoi_thang_truoc']),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

    ws['!cols'] = [
      { wch: 14 }, { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 }, { wch: 8  },
      ...Array(31).fill({ wch: 5 }),
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 },
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } }, alignment: { horizontal: 'center' } };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Danh_sach_NV');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="danh_sach_nhan_vien_${today}.xlsx"`,
      },
    });
  } catch (e) {
    console.error('[GET /api/employees/export]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
