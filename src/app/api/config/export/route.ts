import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

function formatDate(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? DEFAULT_MONTH_ID;
  const conn = await getConn();

  const now = new Date();
  const exportDate = `${String(now.getFullYear())}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const [monthRow] = await conn.all<{ month: string }>(
    `SELECT month FROM months WHERE id = ?`, monthId
  );
  // "06/2025" → "Thang_062025"
  const monthLabel = monthRow?.month
    ? 'Thang_' + monthRow.month.replace('/', '')
    : monthId;

  /* 1. Phòng ban */
  const depts = await conn.all<Record<string, unknown>>(
    `SELECT code, name, note FROM departments WHERE month_id = ? ORDER BY code`, monthId
  );

  /* 2. Ca làm việc */
  const shifts = await conn.all<Record<string, unknown>>(
    `SELECT s.name, d.code AS deptCode, s.shift_type, s.window_start, s.clock_in, s.clock_out, s.window_end
     FROM shifts s LEFT JOIN departments d ON d.id = s.department_id
     WHERE s.month_id = ? ORDER BY s.name`, monthId
  );

  /* 3. Loại nghỉ phép */
  const leaveTypes = await conn.all<Record<string, unknown>>(
    `SELECT code, name, description FROM leave_types WHERE month_id = ? ORDER BY code`, monthId
  );

  /* 4. Nhóm đặc thù */
  const groups = await conn.all<Record<string, unknown>>(
    `SELECT code, name, work_hours, note FROM special_groups WHERE month_id = ? ORDER BY code`, monthId
  );

  /* 5. Quy tắc phân bổ */
  const rules = await conn.all<Record<string, unknown>>(
    `SELECT group_code, group_name, name, param_key, param_value, default_param, specific_value
     FROM alloc_rules WHERE month_id = ? ORDER BY group_code, created_at, id`, monthId
  );

  /* 6. Danh sách nhân viên */
  const DAY_COLS = Array.from({ length: 31 }, (_, i) => `e.day_${i + 1}`).join(', ');
  const employees = await conn.all<Record<string, unknown>>(
    `SELECT e.code, e.name,
            COALESCE(d1.code, d2.code, e.ma_pb) AS dept_code,
            COALESCE(d1.name, d2.name) AS dept_name,
            e.special_group, e.workdays, ${DAY_COLS},
            e.phep_nam, e.ngay_nghi_cuoi_thang_truoc
     FROM employees e
     LEFT JOIN departments d1 ON d1.id = e.department_id AND d1.month_id = e.month_id AND e.department_id <> ''
     LEFT JOIN departments d2 ON UPPER(d2.code) = UPPER(e.ma_pb) AND d2.month_id = e.month_id AND e.ma_pb <> ''
     WHERE e.month_id = ? ORDER BY e.code`, monthId
  );

  await conn.close();

  const wb = XLSX.utils.book_new();

  /* Sheet 1: Phòng ban */
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Mã PB', 'Tên Phòng Ban', 'Ghi Chú'],
    ...depts.map(r => [r.code, r.name, r.note ?? '']),
  ]);
  ws1['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'PhongBan');

  /* Sheet 2: Ca làm việc */
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Tên Ca', 'Mã Phòng Ban', 'Loại Ca', 'Giờ Vào (BD)', 'Giờ Vào', 'Giờ Tan', 'Giờ Tan (KT)'],
    ...shifts.map(r => [r.name, r.deptCode ?? '', r.shift_type, r.window_start ?? '', r.clock_in, r.clock_out, r.window_end ?? '']),
  ]);
  ws2['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'CaLamViec');

  /* Sheet 3: Loại nghỉ phép */
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Mã Loại', 'Tên Loại Nghỉ', 'Mô Tả'],
    ...leaveTypes.map(r => [r.code, r.name, r.description ?? '']),
  ]);
  ws3['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'LoaiNghiPhep');

  /* Sheet 4: Nhóm đặc thù */
  const ws4 = XLSX.utils.aoa_to_sheet([
    ['Mã Nhóm', 'Tên Nhóm', 'Giờ Làm Việc / Ngày', 'Ghi Chú'],
    ...groups.map(r => [r.code, r.name, r.work_hours, r.note ?? '']),
  ]);
  ws4['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'NhomDacThu');

  /* Sheet 5: Quy tắc phân bổ */
  const ws5 = XLSX.utils.aoa_to_sheet([
    ['Nhóm', 'Tên Nhóm', 'Quy Tắc', 'Mã Quy Tắc', 'Giá Trị (Số)', 'Giá Trị Hiển Thị', 'Ghi Chú'],
    ...rules.map(r => [
      String(r.group_code ?? ''), 
      String(r.group_name ?? ''), 
      String(r.name ?? ''),
      String(r.param_key ?? ''), 
      r.param_value != null ? String(r.param_value) : '', 
      String(r.default_param ?? ''), 
      String(r.specific_value ?? ''),
    ]),
  ]);
  ws5['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'QuyTacPhanBo');

  /* Sheet 6: Danh sách nhân viên */
  const empHeader = [
    'employee_code', 'employee_name', 
    'department_code', 'department_name', 
    'group_code', 'group_name',
    'group_code_end_date', 'workdays',
    ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
    'overtime_hours', 'late_minutes', 
    'phep_nam', 'ngay_nghi_thang_truoc',
  ];
  const ws6 = XLSX.utils.aoa_to_sheet([
    empHeader,
    ...employees.map(r => [
      r.code, r.name, 
      r.dept_code ?? '', r.dept_name ?? '',
      r.special_group ?? '', r.group_name ?? '',
      r.group_code_end_date ?? '', r.workdays ?? '',
      ...Array.from({ length: 31 }, (_, i) => r[`day_${i + 1}`] ?? ''),
      r.overtime_hours ?? '', r.late_minutes ?? '',
      r.phep_nam ?? '', formatDate(r.ngay_nghi_cuoi_thang_truoc),
    ]),
  ]);
  ws6['!cols'] = [
    { wch: 14 }, { wch: 22 },
    { wch: 12 }, { wch: 22 },
    { wch: 16 }, { wch: 24 },
    { wch: 16 }, { wch: 8 },
    ...Array(31).fill({ wch: 5 }),
    { wch: 12 }, { wch: 10 }, 
    { wch: 10 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws6, 'NhanVien');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(`${monthLabel}_tong_hop_cau_hinh_bo_${exportDate}.xlsx`)}"`,
    },
  });
}
