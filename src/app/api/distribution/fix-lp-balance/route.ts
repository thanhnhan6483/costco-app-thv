import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-lp-balance
 * Body: { monthId }
 * Cân bằng số ngày LP giữa NV cùng phòng ban (chênh ≤ 1).
 * Chỉ sửa NV vi phạm, không ảnh hưởng NV đã đúng.
 */
export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);

    const skipCodes = new Set(params.skipEqualRestDeptCodes.map(c => c.toUpperCase()));

    // Load employees + dept
    const empRows = await conn.all<{ empId: string; empCode: string; deptId: string; deptCode: string }>(
      `SELECT e.id AS empId, e.code AS empCode, e.department_id AS deptId, d.code AS deptCode
       FROM employees e JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ?`, monthId
    );

    // Load distribution_results
    const drRows = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT employee_id AS empId, day, day_type AS dayType
       FROM distribution_results WHERE month_id = ? ORDER BY employee_id, day`, monthId
    );

    // Build map: empId → days array (0-indexed, length=daysInMonth)
    const empDays = new Map<string, number[]>();
    for (const e of empRows) {
      empDays.set(e.empId, Array(daysInMonth).fill(-1));
    }
    for (const r of drRows) {
      const arr = empDays.get(r.empId);
      if (arr && r.day >= 1 && r.day <= daysInMonth) arr[r.day - 1] = r.dayType;
    }

    // Group by dept (skip excluded depts)
    const deptGroups = new Map<string, string[]>(); // deptId → empIds
    for (const e of empRows) {
      if (skipCodes.has(e.deptCode.toUpperCase())) continue;
      if (!deptGroups.has(e.deptId)) deptGroups.set(e.deptId, []);
      deptGroups.get(e.deptId)!.push(e.empId);
    }

    const changes: { empId: string; day: number; dayType: number }[] = [];

    for (const [, members] of deptGroups) {
      if (members.length < 2) continue;

      const lpCounts = members.map(id => (empDays.get(id) ?? []).filter(v => v === 1).length);
      const minLP = Math.min(...lpCounts);
      const maxLP = Math.max(...lpCounts);
      if (maxLP - minLP <= 1) continue;

      // Target: tất cả NV trong phòng nên có LP = median (làm tròn về minLP+1 hoặc minLP)
      // Chiến lược: đưa tất cả về target = minLP+1 (hoặc minLP nếu không đủ X để đổi)
      const target = minLP + 1;

      for (let mi = 0; mi < members.length; mi++) {
        const empId = members[mi];
        const arr = [...(empDays.get(empId) ?? [])];
        const currentLP = lpCounts[mi];
        if (currentLP === target) continue;

        if (currentLP > target) {
          // Quá nhiều LP → đổi LP thừa → X (ngày làm)
          // Ưu tiên đổi LP ở đầu tháng (trước pnStartFromDay) để ít ảnh hưởng nhất
          let toRemove = currentLP - target;
          for (let i = 0; i < daysInMonth && toRemove > 0; i++) {
            if (arr[i] !== 1) continue;
            // Kiểm tra: nếu đổi LP→X có tạo run X > maxConsecutiveDays không?
            let runLen = 1;
            for (let j = i - 1; j >= 0 && arr[j] === 0; j--) runLen++;
            for (let j = i + 1; j < daysInMonth && arr[j] === 0; j++) runLen++;
            if (runLen > params.maxConsecutiveDays) continue;
            arr[i] = 0;
            changes.push({ empId, day: i + 1, dayType: 0 });
            toRemove--;
          }
        } else {
          // Quá ít LP → đổi X thừa → LP
          // Ưu tiên đổi X ở đầu tháng (trước pnStartFromDay)
          let toAdd = target - currentLP;
          for (let i = 0; i < daysInMonth && toAdd > 0; i++) {
            if (arr[i] !== 0) continue;
            // Kiểm tra: nếu đổi X→LP, run X liền kề không bị phá vỡ quá mức
            // (thêm LP thì run X ngắn lại → an toàn)
            arr[i] = 1;
            changes.push({ empId, day: i + 1, dayType: 1 });
            toAdd--;
          }
        }
        // Cập nhật lại lpCounts để các vòng sau tính đúng
        lpCounts[mi] = arr.filter(v => v === 1).length;
        empDays.set(empId, arr);
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({ ok: true, fixed: 0, message: 'Không có vi phạm cân bằng LP nào cần sửa' });
    }

    // Batch update
    for (const c of changes) {
      await conn.run(
        `UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
        c.dayType, monthId, c.empId, c.day
      );
    }

    const fixedEmps = new Set(changes.map(c => c.empId)).size;
    await conn.close();
    return NextResponse.json({ ok: true, fixed: fixedEmps, changes: changes.length });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
