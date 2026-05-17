import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
  const conn = await getConn();
  const rows = await conn.all<{ code: string; name: string; description: string; note: string; dayType: number }>(
    `SELECT code, name, description, note, COALESCE(day_type, -1) AS dayType
     FROM leave_types WHERE month_id = ? ORDER BY code`,
    monthId
  );
  await conn.close();

  const HEADERS = ['Mã Loại', 'Tên Loại Nghỉ', 'Mô Tả'];
  const data = rows.map(r => [r.code, r.name, r.description ?? '']);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data]);
  ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws, 'LoaiNghiPhep');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="loai_nghi_phep_${monthId}.xlsx"`,
    },
  });
}
