import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

const HEADERS = ['Tên Ca', 'Mã Phòng Ban', 'Loại Ca', 'Giờ Vào', 'Giờ Ra', 'Cửa Sổ Vào', 'Cửa Sổ Ra'];
const SAMPLE_ROWS = [
  ['Ca Sáng Kinh Doanh', 'KD', 'Ca 1', '07:30', '16:30', '07:20', '16:35'],
  ['Ca Chiều Bảo Vệ',    'BV', 'Ca 2', '14:00', '22:00', '13:50', '22:10'],
  ['Ca Chung Công Ty',   '',   'Chung','07:30', '16:30', '07:20', '16:35'],
];

export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'CaLamViec');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="mau_ca_lam_viec.xlsx"',
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
    if (!('Tên Ca' in data[0]) || !('Giờ Vào' in data[0])) {
      return NextResponse.json({ error: 'File không đúng cấu trúc. Vui lòng tải mẫu.' }, { status: 422 });
    }

    const monthId = (formData.get('monthId') as string) ?? DEFAULT_MONTH_ID;
    const conn = await getConn();

    // Build dept code→id map
    const depts = await conn.all<{ id: string; code: string }>(
      `SELECT id, code FROM departments WHERE month_id = ?`, monthId
    );
    const deptMap = new Map(depts.map(d => [d.code.toUpperCase(), d.id]));

    const results = { inserted: 0, skipped: 0, skippedCodes: [] as string[], errors: [] as string[] };
    const now = new Date().toISOString().slice(0, 10);

    for (const row of data) {
      const name       = String(row['Tên Ca']       ?? '').trim();
      const deptCode   = String(row['Mã Phòng Ban'] ?? '').trim().toUpperCase();
      const shiftType  = String(row['Loại Ca']      ?? '').trim() || 'Ca 1';
      const clockIn    = String(row['Giờ Vào']      ?? '').trim();
      const clockOut   = String(row['Giờ Ra']       ?? '').trim();
      const winStart   = String(row['Cửa Sổ Vào']  ?? '').trim();
      const winEnd     = String(row['Cửa Sổ Ra']   ?? '').trim();

      if (!name || !clockIn || !clockOut) {
        results.skipped++; results.skippedCodes.push(name || '(trống)'); continue;
      }
      try {
        const deptId = deptCode ? (deptMap.get(deptCode) ?? null) : null;
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
        await conn.run(
          `INSERT INTO shifts (id, month_id, name, department_id, shift_type, window_start, clock_in, clock_out, window_end, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id, monthId, name, deptId, shiftType, winStart, clockIn, clockOut, winEnd, now
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
