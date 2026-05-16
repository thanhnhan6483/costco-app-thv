/**
 * POST /api/months/copy
 * Copy toàn bộ cấu hình từ tháng nguồn sang tháng đích.
 * Body: { fromMonthId: string, toMonthId: string }
 * Mỗi record sẽ được tạo ID mới (prefix + suffix ngẫu nhiên).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';

export const runtime = 'nodejs';

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(req: NextRequest) {
  const conn = await getConn();
  try {
    const { fromMonthId, toMonthId } = await req.json();
    if (!fromMonthId || !toMonthId) {
      return NextResponse.json({ error: 'fromMonthId và toMonthId là bắt buộc' }, { status: 400 });
    }
    if (fromMonthId === toMonthId) {
      return NextResponse.json({ error: 'Không thể copy vào cùng tháng' }, { status: 400 });
    }

    await conn.run('BEGIN TRANSACTION');
    const now = new Date().toISOString().slice(0, 10);

    /* 1. Departments */
    const depts = await conn.all<{
      id: string; code: string; name: string; parent_id: string | null;
      active: boolean; note: string;
    }>(`SELECT id, code, name, parent_id, active, note FROM departments WHERE month_id = ?`, fromMonthId);

    // Map old-id -> new-id để giữ quan hệ parent
    const deptIdMap: Record<string, string> = {};
    for (const d of depts) {
      const newDeptId = newId('d');
      deptIdMap[d.id] = newDeptId;
    }
    for (const d of depts) {
      const parentId = d.parent_id ? (deptIdMap[d.parent_id] ?? null) : null;
      await conn.run(
        `INSERT INTO departments (id, month_id, code, name, parent_id, active, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        deptIdMap[d.id], toMonthId, d.code, d.name, parentId, d.active, d.note, now
      );
    }

    /* 2. Shifts */
    const shifts = await conn.all<{
      id: string; name: string; department_id: string | null;
      is_default: boolean; shift_type: string; window_start: string;
      clock_in: string; clock_out: string; window_end: string;
      late_minutes: number; ot_threshold: number; ot_calc: string; note: string;
    }>(`SELECT id, name, department_id, is_default, shift_type,
               window_start, clock_in, clock_out, window_end,
               late_minutes, ot_threshold, ot_calc, note
        FROM shifts WHERE month_id = ?`, fromMonthId);

    for (const s of shifts) {
      const newDeptId = s.department_id ? (deptIdMap[s.department_id] ?? null) : null;
      await conn.run(
        `INSERT INTO shifts (id, month_id, name, department_id, is_default, shift_type,
           window_start, clock_in, clock_out, window_end,
           late_minutes, ot_threshold, ot_calc, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId('s'), toMonthId, s.name, newDeptId, s.is_default, s.shift_type,
        s.window_start, s.clock_in, s.clock_out, s.window_end,
        s.late_minutes, s.ot_threshold, s.ot_calc, s.note, now
      );
    }

    /* 3. Leave Types */
    const lts = await conn.all<{
      code: string; name: string; description: string; paid: boolean; note: string;
    }>(`SELECT code, name, description, paid, note FROM leave_types WHERE month_id = ?`, fromMonthId);

    for (const lt of lts) {
      await conn.run(
        `INSERT INTO leave_types (id, month_id, code, name, description, paid, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        newId('lt'), toMonthId, lt.code, lt.name, lt.description, lt.paid, lt.note, now
      );
    }

    /* 4. Special Groups */
    const sgs = await conn.all<{
      code: string; name: string; work_hours: number; note: string;
    }>(`SELECT code, name, work_hours, note FROM special_groups WHERE month_id = ?`, fromMonthId);

    for (const sg of sgs) {
      await conn.run(
        `INSERT INTO special_groups (id, month_id, code, name, work_hours, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        newId('sg'), toMonthId, sg.code, sg.name, sg.work_hours, sg.note, now
      );
    }

    /* 5. Alloc Rules */
    const ars = await conn.all<{
      group_code: string; group_name: string; name: string; param_key: string;
      param_value: number | null; default_param: string; specific_value: string;
      description: string; active: boolean;
    }>(`SELECT group_code, group_name, name, param_key, param_value,
               default_param, specific_value, description, active
        FROM alloc_rules WHERE month_id = ?`, fromMonthId);

    for (const ar of ars) {
      await conn.run(
        `INSERT INTO alloc_rules (id, month_id, group_code, group_name, name, param_key, param_value,
           default_param, specific_value, description, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId('ar'), toMonthId, ar.group_code, ar.group_name, ar.name, ar.param_key, ar.param_value,
        ar.default_param, ar.specific_value, ar.description, ar.active, now
      );
    }

    /* Không copy employees — nhân viên thường được import mới mỗi tháng */

    await conn.run('COMMIT');
    await conn.close();

    return NextResponse.json({
      ok: true,
      copied: {
        departments: depts.length,
        shifts: shifts.length,
        leaveTypes: lts.length,
        specialGroups: sgs.length,
        allocRules: ars.length,
      },
    });
  } catch (e) {
    try { await conn.run('ROLLBACK'); } catch { /* ignore */ }
    await conn.close();
    console.error('[POST /api/months/copy]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
