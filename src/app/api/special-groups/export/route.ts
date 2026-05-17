import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
  const conn = await getConn();
  const rows = await conn.all<{ code: string; name: string; workHours: number; note: string }>(
    `SELECT code, name, work_hours AS workHours, note
     FROM special_groups WHERE month_id = ? ORDER BY code`,
    monthId
  );
  await conn.close();

  const HEADERS = ['Mã Nhóm', 'Tên Nhóm', 'Giờ Làm Việc / Ngày', 'Ghi Chú'];
  const data = rows.map(r => [r.code, r.name, r.workHours, r.note ?? '']);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data]);
  ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'NhomDacThu');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="nhom_dac_thu_${monthId}.xlsx"`,
    },
  });
}
