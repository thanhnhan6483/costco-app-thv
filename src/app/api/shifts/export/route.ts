import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
  const conn = await getConn();
  const rows = await conn.all<{
    name: string; departmentCode: string | null; shiftType: string;
    clockIn: string; clockOut: string; windowStart: string; windowEnd: string;
  }>(
    `SELECT s.name, d.code AS departmentCode, s.shift_type AS shiftType,
            s.clock_in AS clockIn, s.clock_out AS clockOut,
            s.window_start AS windowStart, s.window_end AS windowEnd
     FROM shifts s
     LEFT JOIN departments d ON d.id = s.department_id
     WHERE s.month_id = ? ORDER BY s.name`,
    monthId
  );
  await conn.close();

  const HEADERS = ['Tên Ca', 'Mã Phòng Ban', 'Loại Ca', 'Giờ Vào', 'Giờ Ra', 'Cửa Sổ Vào', 'Cửa Sổ Ra'];
  const data = rows.map(r => [r.name, r.departmentCode ?? '', r.shiftType, r.clockIn, r.clockOut, r.windowStart ?? '', r.windowEnd ?? '']);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data]);
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'CaLamViec');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ca_lam_viec_${monthId}.xlsx"`,
    },
  });
}
