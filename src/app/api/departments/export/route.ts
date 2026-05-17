import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
  const conn = await getConn();
  const rows = await conn.all<{ code: string; name: string; parentName: string | null; note: string }>(
    `SELECT d.code, d.name, p.code AS parentCode, d.note
     FROM departments d
     LEFT JOIN departments p ON p.id = d.parent_id AND p.month_id = d.month_id
     WHERE d.month_id = ? ORDER BY d.code`,
    monthId
  );
  await conn.close();

  const HEADERS = ['Mã PB', 'Tên Phòng Ban', 'Phòng Ban Cấp Trên', 'Ghi Chú'];
  const data = rows.map(r => [r.code, r.name, r.parentCode ?? '', r.note ?? '']);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data]);
  ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'PhongBan');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="phong_ban_${monthId}.xlsx"`,
    },
  });
}
