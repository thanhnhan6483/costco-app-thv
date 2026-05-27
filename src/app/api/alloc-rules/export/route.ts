import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
  const conn = await getConn();
  const rows = await conn.all<Record<string, unknown>>(
    `SELECT group_code AS groupCode, group_name AS groupName, name,
            param_key AS paramKey, param_value AS paramValue, default_param AS defaultParam, specific_value AS specificValue
     FROM alloc_rules WHERE month_id = ? ORDER BY group_code, created_at, id`,
    monthId
  );
  await conn.close();

  const HEADERS = ['Nhóm', 'Tên Nhóm', 'Quy Tắc', 'Mã Quy Tắc', 'Giá Trị (Số)', 'Giá Trị Hiển Thị', 'Ghi Chú'];
  const data = rows.map(r => [
    String(r.groupCode ?? ''), 
    String(r.groupName ?? ''), 
    String(r.name ?? ''),
    String(r.paramKey ?? ''), 
    r.paramValue != null ? String(r.paramValue) : '', 
    String(r.defaultParam ?? ''), 
    String(r.specificValue ?? ''),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...data]);
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'QuyTacPhanBo');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="quy_tac_phan_bo_${monthId}.xlsx"`,
    },
  });
}
