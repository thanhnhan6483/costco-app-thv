import { NextRequest, NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const XLSX = await import('xlsx-js-style');
  const wb = XLSX.utils.book_new();
  const header = [
    'employee_code', 'employee_name', 'department_code', 'group_code', 'group_code_end_date', 'workdays',
    ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
    'overtime_hours', 'late_minutes', 'phep_nam', 'ngay_nghi_thang_truoc',
  ];
  const sample = [
    'NV001', 'Nguyễn Văn A', 'KD', 'FULL', '31/12/2026', 26,
    ...Array(31).fill(''),
    0, 0, 0, '',
  ];
  const ws = XLSX.utils.aoa_to_sheet([header, sample]);
  ws['!cols'] = header.map((_h, i) => ({ wch: i < 6 ? 18 : 5 }));
  XLSX.utils.book_append_sheet(wb, ws, 'cham_cong_template');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="mau_import_nhan_vien.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const monthId = (form.get('monthId') as string | null) ?? DEFAULT_MONTH_ID;
    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });

    const XLSX = await import('xlsx-js-style');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: '' });

    // ── Validate file ──────────────────────────────────────────────
    if (rows.length === 0) {
      return NextResponse.json({ error: 'File Excel trống, không có dữ liệu.' }, { status: 400 });
    }

    const REQUIRED_COLS = ['employee_code', 'employee_name'];
    const firstRow = rows[0];
    const missingCols = REQUIRED_COLS.filter(c => !(c in firstRow));
    if (missingCols.length > 0) {
      return NextResponse.json({
        error: `File thiếu cột bắt buộc: ${missingCols.join(', ')}.\n` +
          `Vui lòng tải lại file mẫu (nút "Tải Mẫu") và điền đúng tên cột.`,
      }, { status: 400 });
    }

    // Kiểm tra có ít nhất 1 dòng có mã NV
    const validRows = rows.filter(r => String(r['employee_code'] ?? '').trim());
    if (validRows.length === 0) {
      return NextResponse.json({
        error: 'Không tìm thấy dòng nào có Mã NV (cột employee_code). Vui lòng kiểm tra lại dữ liệu.',
      }, { status: 400 });
    }

    const conn = await getConn();
    // Lấy departments của tháng này — build map theo cả code và name
    const depts = await conn.all<{ id: string; code: string; name: string }>(
      `SELECT id, code, name FROM departments WHERE month_id = ?`, monthId
    );

    // Map theo code (ưu tiên 1)
    const deptByCode: Record<string, string> = {};
    // Map theo tên đầy đủ (ưu tiên 2)
    const deptByName: Record<string, string> = {};
    // Danh sách để partial match (ưu tiên 3)
    const deptList: { id: string; code: string; name: string }[] = [];

    depts.forEach(d => {
      deptByCode[d.code.toUpperCase().trim()] = d.id;
      deptByName[d.name.toUpperCase().trim()]  = d.id;
      deptList.push(d);
    });

    /** Tìm departmentId theo mã hoặc tên — trả '' nếu không tìm thấy */
    function resolveDept(raw: string): string {
      const key = raw.toUpperCase().trim();
      if (!key) return '';
      // 1. Khớp mã chính xác
      if (deptByCode[key]) return deptByCode[key];
      // 2. Khớp tên chính xác
      if (deptByName[key]) return deptByName[key];
      // 3. Partial: tên phòng ban chứa từ khóa hoặc ngược lại
      const found = deptList.find(d =>
        d.name.toUpperCase().includes(key) || key.includes(d.name.toUpperCase()) ||
        d.code.toUpperCase().includes(key)
      );
      return found?.id ?? '';
    }

    let inserted = 0, skipped = 0;
    const skippedCodes: string[] = [], errors: string[] = [];
    const unmappedDept: { code: string; name: string; deptCode: string }[] = [];

    const dayColList = Array.from({ length: 31 }, (_, i) => `day_${i + 1}`).join(', ');
    const dayPlaceholders = Array(31).fill('?').join(', ');

    // Lấy danh sách mã đã tồn tại để skip trùng
    const existingRows = await conn.all<{ code: string }>(
      `SELECT code FROM employees WHERE month_id = ?`, monthId
    );
    const existingCodes = new Set(existingRows.map(r => r.code));

    // Build danh sách rows hợp lệ
    const toInsert: unknown[][] = [];
    const now = new Date().toISOString().slice(0, 10);

    for (const row of rows) {
      const code = String(row['employee_code'] ?? '').trim();
      const name = String(row['employee_name'] ?? '').trim();
      if (!code || !name) continue;

      if (existingCodes.has(code)) { skipped++; skippedCodes.push(code); continue; }

      const maPbRaw      = String(row['department_code'] ?? row['department_name'] ?? row['Mã PB'] ?? '').trim();
      const departmentId = resolveDept(maPbRaw);
      const specialGroup = String(row['group_code'] ?? '').trim();
      const groupCodeEndDate = String(row['group_code_end_date'] ?? '').trim();
      const workdays = String(row['workdays'] ?? '').trim();
      const overtimeHours = String(row['overtime_hours'] ?? '').trim();
      const lateMinutes = String(row['late_minutes'] ?? '').trim();
      const phepNam = String(row['phep_nam'] ?? '').trim();
      const ngayNghiCuoiThangTruoc = String(row['ngay_nghi_thang_truoc'] ?? '').trim();
      const dayVals = Array.from({ length: 31 }, (_, i) => String(row[`Day ${i + 1}`] ?? '').trim());

      if (maPbRaw && !departmentId) {
        unmappedDept.push({ code, name, deptCode: maPbRaw });
      }

      toInsert.push([
        `${monthId}_${code}`,
        monthId, code, name, departmentId, maPbRaw, specialGroup, groupCodeEndDate,
        workdays, overtimeHours, lateMinutes, phepNam, ngayNghiCuoiThangTruoc,
        now, ...dayVals,
      ]);
    }

    // Batch insert trong 1 transaction
    if (toInsert.length > 0) {
      const stmt = await conn.prepare(
        `INSERT INTO employees
           (id, month_id, code, name, department_id, ma_pb, special_group, group_code_end_date,
            workdays, overtime_hours, late_minutes, phep_nam, ngay_nghi_cuoi_thang_truoc, active, created_at, ${dayColList})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ${dayPlaceholders})`
      );
      await conn.run('BEGIN');
      try {
        for (const params of toInsert) {
          await stmt.run(...params as Parameters<typeof stmt.run>);
          inserted++;
        }
        await conn.run('COMMIT');
      } catch (e: unknown) {
        await conn.run('ROLLBACK');
        errors.push(e instanceof Error ? e.message : String(e));
      }
      await stmt.finalize();
    }

    await conn.close();
    return NextResponse.json({ inserted, skipped, skippedCodes, errors, unmappedDept });
  } catch (e) {
    console.error('[POST /api/employees/import]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
