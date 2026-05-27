import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

const HEADERS = ['Mã Loại', 'Tên Loại Nghỉ', 'Mô Tả', 'Ghi Chú'];
const SAMPLE_ROWS = [
  ['PN',  'Phép năm',        'Nghỉ phép năm theo chính sách', 'Tính ngày công: Không'],
  ['Ô',   'Nghỉ ốm',         'Nghỉ ốm đau',                   'Tính ngày công: Không'],
  ['NL',  'Nghỉ lễ',         'Ngày lễ quốc gia',              'Tính ngày công: Không'],
];

export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 36 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, ws, 'LoaiNghiPhep');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="mau_loai_nghi_phep.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });

    const sheetName = (formData.get('sheetName') as string) || undefined;

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const targetSheet = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
    const ws = wb.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
    if (!data.length) return NextResponse.json({ error: 'File trống' }, { status: 400 });
    if (!('Mã Loại' in data[0])) {
      return NextResponse.json({ error: 'File không đúng cấu trúc. Vui lòng tải mẫu.' }, { status: 422 });
    }

    const monthId = (formData.get('monthId') as string) ?? DEFAULT_MONTH_ID;
    const conn = await getConn();
    const existing = await conn.all<{ code: string }>(
      `SELECT code FROM leave_types WHERE month_id = ?`, monthId
    );
    const existingCodes = new Set(existing.map(r => r.code.toUpperCase()));

    const results = { inserted: 0, skipped: 0, skippedCodes: [] as string[], errors: [] as string[] };
    const now = new Date().toISOString().slice(0, 10);

    for (const row of data) {
      const code = String(row['Mã Loại']      ?? '').trim();
      const name = String(row['Tên Loại Nghỉ'] ?? '').trim();
      const desc = String(row['Mô Tả']         ?? '').trim();
      const note = String(row['Ghi Chú']        ?? '').trim();

      if (!code || !name) { results.skipped++; results.skippedCodes.push(code || '(trống)'); continue; }
      if (existingCodes.has(code.toUpperCase())) { results.skipped++; results.skippedCodes.push(code); continue; }

      try {
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
        await conn.run(
          `INSERT INTO leave_types (id, month_id, code, name, description, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          id, monthId, code, name, desc, note, now
        );
        existingCodes.add(code.toUpperCase());
        results.inserted++;
      } catch (e: unknown) {
        results.errors.push(`${code}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await conn.close();
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
