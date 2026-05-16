import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { markStepDone, DAY_COLS } from '@/lib/stepHelpers';
import { parsePage, buildPagedResponse } from '@/lib/paginate';
export const runtime = 'nodejs';

// GET — dữ liệu import theo trang
export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const monthId = url.searchParams.get('month') ?? '';
  const { page, limit, offset } = parsePage(url);
  const conn = await getConn();
  try {
    const [{ total }] = await conn.all<{ total: number }>(
      `SELECT COUNT(*) AS total FROM employees WHERE month_id = ? AND active = TRUE`, monthId
    );
    const empPage = await conn.all<Record<string, string>>(
      `SELECT e.id, e.code, e.name, d.name AS deptName,
              e.special_group AS specialGroup,
              e.group_code_end_date AS groupCodeEndDate,
              e.ngay_nghi_cuoi_thang_truoc AS ngayNghiCuoiThangTruoc,
              e.workdays, e.overtime_hours AS overtimeHours,
              e.late_minutes AS lateMinutes, e.phep_nam AS phepNam,
              ${DAY_COLS.map(c => `e.${c}`).join(', ')}
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ? AND e.active = TRUE
       ORDER BY e.code LIMIT ? OFFSET ?`, monthId, limit, offset
    );

    const data = empPage.map(emp => ({
      id: emp.id, code: emp.code, name: emp.name,
      deptName: emp.deptName ?? '',
      specialGroup: emp.specialGroup ?? '',
      ngayNghiCuoiThangTruoc: emp.ngayNghiCuoiThangTruoc ?? '',
      workdays: emp.workdays,
      overtimeHours: emp.overtimeHours ? (Math.round(parseFloat(String(emp.overtimeHours).replace(',', '.')) * 100) / 100).toString() : '0',
      lateMinutes: emp.lateMinutes ? (Math.round(parseFloat(String(emp.lateMinutes).replace(',', '.')) * 100) / 100).toString() : '0',
      phepNam: emp.phepNam,
      days: DAY_COLS.map((c, i) => ({ day: i + 1, symbol: (emp[c] ?? '').trim() })),
    }));

    await conn.close();
    return NextResponse.json(buildPagedResponse(data, Number(total), page, limit));
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — đánh dấu step 2 done (người dùng đã xem và xác nhận)
export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  await markStepDone(monthId, 1);
  return NextResponse.json({ ok: true, step: 2 });
}
