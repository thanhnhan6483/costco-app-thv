import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

const HEADERS = ['Tên Ca', 'Mã Phòng Ban', 'Loại Ca', 'Giờ Vào (BD)', 'Giờ Vào', 'Giờ Tan', 'Giờ Tan (KT)', 'Cách Tính OT'];
const SAMPLE_ROWS = [
  ['Ca Sáng Kinh Doanh', 'KD', 'Ca 1', '07:20', '07:30', '16:30', '16:35', 'Tính từ giờ ra (cộng)'],
  ['Ca Chiều Bảo Vệ',    'BV', 'Ca 2', '13:50', '14:00', '22:00', '22:10', 'Tính từ giờ vào (trừ)'],
  ['Ca Chung Công Ty',   '',   'Chung','07:20', '07:30', '16:30', '16:35', 'Tính từ giờ ra (cộng)'],
];

export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, 'CaLamViec');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="mau_ca_lam_viec.xlsx"',
    },
  });
}

/** Convert Excel time (fraction of day hoặc chuỗi) → "HH:MM" */
function toHHMM(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    const totalMin = Math.round(val * 1440); // 1440 = 24*60
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  const s = String(val).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (match) return match[1].padStart(2, '0') + ':' + match[2];
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });

    const sheetName = (formData.get('sheetName') as string) || undefined;

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });
    const targetSheet = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
    const ws = wb.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
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
      const winStart   = toHHMM(row['Giờ Vào (BD)']);
      const clockIn    = toHHMM(row['Giờ Vào']);
      const clockOut   = toHHMM(row['Giờ Tan']);
      const winEnd     = toHHMM(row['Giờ Tan (KT)']);
      const otCalc     = String(row['Cách Tính OT'] ?? '').trim() || 'Tính từ giờ ra (cộng)';

      if (!name || !clockIn || !clockOut) {
        results.skipped++; results.skippedCodes.push(name || '(trống)'); continue;
      }
      try {
        const deptId = deptCode ? (deptMap.get(deptCode) ?? null) : null;
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
        await conn.run(
          `INSERT INTO shifts (id, month_id, name, department_id, shift_type, window_start, clock_in, clock_out, window_end, ot_calc, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id, monthId, name, deptId, shiftType, winStart, clockIn, clockOut, winEnd, otCalc, now
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
