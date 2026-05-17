import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

const HEADERS = ['Mã Nhóm', 'Tên Nhóm', 'Tên Quy Tắc', 'Param Key', 'Giá Trị Mặc Định', 'Giá Trị Cụ Thể', 'Kích Hoạt'];
const SAMPLE_ROWS = [
  ['WORK_RULE', 'Quy tắc làm việc', 'Giới hạn ngày làm liên tục', 'max_consecutive_days', '6 ngày', '', 'TRUE'],
  ['OT_RULE',   'Quy tắc tăng ca',  'Giờ tăng ca tối đa',          'max_ot_per_day',       '60 phút','', 'TRUE'],
];

export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = [{ wch: 22 }, { wch: 24 }, { wch: 32 }, { wch: 26 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'QuyTacPhanBo');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="mau_quy_tac_phan_bo.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
    if (!data.length) return NextResponse.json({ error: 'File trống' }, { status: 400 });
    if (!('Tên Quy Tắc' in data[0])) {
      return NextResponse.json({ error: 'File không đúng cấu trúc. Vui lòng tải mẫu.' }, { status: 422 });
    }

    const monthId = (formData.get('monthId') as string) ?? DEFAULT_MONTH_ID;
    const conn = await getConn();

    const results = { inserted: 0, skipped: 0, skippedCodes: [] as string[], errors: [] as string[] };
    const now = new Date().toISOString().slice(0, 10);

    for (const row of data) {
      const groupCode    = String(row['Mã Nhóm']          ?? '').trim() || 'GENERAL';
      const groupName    = String(row['Tên Nhóm']          ?? '').trim() || 'Chung';
      const name         = String(row['Tên Quy Tắc']       ?? '').trim();
      const paramKey     = String(row['Param Key']          ?? '').trim();
      const defaultParam = String(row['Giá Trị Mặc Định']  ?? '').trim();
      const specificVal  = String(row['Giá Trị Cụ Thể']    ?? '').trim();
      const active       = String(row['Kích Hoạt']          ?? 'TRUE').trim().toUpperCase() !== 'FALSE';

      if (!name) { results.skipped++; results.skippedCodes.push('(trống)'); continue; }

      try {
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
        await conn.run(
          `INSERT INTO alloc_rules (id, month_id, group_code, group_name, name, param_key, default_param, specific_value, active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id, monthId, groupCode, groupName, name, paramKey, defaultParam, specificVal, active, now
        );
        results.inserted++;
      } catch (e: unknown) {
        results.errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await conn.close();
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
