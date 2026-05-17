import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';
import { fromDb } from '@/app/api/alloc-rules/route';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
  const conn = await getConn();
  const rows = await conn.all<Record<string, unknown>>(
    `SELECT group_code AS groupCode, group_name AS groupName, name,
            param_key AS paramKey, default_param AS defaultParam, specific_value AS specificValue
     FROM alloc_rules WHERE month_id = ? ORDER BY group_code, created_at, id`,
    monthId
  );
  await conn.close();

  const HEADERS = ['Nhóm', 'Tên Nhóm', 'Quy Tắc', 'Mã Quy Tắc', 'Giá Trị Mặc Định', 'Ghi Chú'];
  const data = rows.map(r => [
    fromDb(r.groupCode), fromDb(r.groupName), fromDb(r.name),
    String(r.paramKey ?? ''), fromDb(r.defaultParam), fromDb(r.specificValue),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data]);
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 30 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'QuyTacPhanBo');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="quy_tac_phan_bo_${monthId}.xlsx"`,
    },
  });
}
