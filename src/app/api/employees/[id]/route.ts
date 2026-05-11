import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { code, name, departmentId, specialGroup, groupCodeEndDate,
            ngayNghiCuoiThangTruoc, soNgayLamCuoiThangTruoc,
            workdays, overtimeHours, lateMinutes, phepNam, days } = await req.json();

    const daySetList = Array.from({ length: 31 }, (_, i) => `day_${i + 1}=?`).join(', ');
    const dayVals = Array.from({ length: 31 }, (_, i) => days?.[i] ?? '');

    const conn = await getConn();
    await conn.run(
      `UPDATE employees SET code=?, name=?, department_id=?, special_group=?, group_code_end_date=?,
         ngay_nghi_cuoi_thang_truoc=?, so_ngay_lam_cuoi_thang_truoc=?,
         workdays=?, overtime_hours=?, late_minutes=?, phep_nam=?, ${daySetList} WHERE id=?`,
      code, name, departmentId ?? '', specialGroup ?? '', groupCodeEndDate ?? '',
      ngayNghiCuoiThangTruoc ?? '', soNgayLamCuoiThangTruoc ?? 0,
      workdays ?? '', overtimeHours ?? '', lateMinutes ?? '', phepNam ?? '',
      ...dayVals, id,
    );
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Mã nhân viên đã tồn tại' }, { status: 409 });
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conn = await getConn();
    await conn.run(`DELETE FROM employees WHERE id=?`, id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/employees]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conn = await getConn();
    await conn.run(`UPDATE employees SET active = NOT active WHERE id=?`, id);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/employees]', e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
