import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadParams, loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

/**
 * POST /api/distribution/fix-rest-balance
 * Body: { monthId }
 *
 * Cân bằng số người nghỉ GIỮA CÁC NGÀY trong tháng bằng swap X ↔ LP.
 *
 * Thuật toán: Chain Swap (Augmenting Path)
 * - Tìm đường đi từ overDay → underDay qua nhiều bước (thay vì chỉ 1 bước)
 * - BFS trên đồ thị hai phía: Day ⟷ Employee
 *   - Day → Employee: employee có LP trên day đó (có thể đổi LP→X)
 *   - Employee → Day: employee có X trên day đó (có thể đổi X→LP)
 * - Kiểm tra consecutive trước khi chấp nhận path
 *
 * dayType mapping:
 * 0=X (làm), 1=LP (nghỉ), 2=PN (phép năm) ← có thể thay đổi
 * ≥3: Ô, TS, DS, O, NL, OF, P... ← Dữ liệu cố định, KHÔNG thay đổi
 */
export async function POST(req: NextRequest) {
  const { monthId } = await req.json() as { monthId: string };
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const conn = await getConn();
  try {
    const params = await loadParams(monthId);
    const { daysInMonth } = await loadMonthInfo(monthId);
    const maxConsec = params.maxConsecutiveDays;
    const skipCodes = new Set(params.skipEqualRestDeptCodes.map(c => c.toUpperCase()));

    // Load employees + dept + ngayNghiCuoiThangTruoc
    const empRows = await conn.all<{ empId: string; empCode: string; deptId: string; deptCode: string; ngayNghiCuoiThangTruoc: string }>(
      `SELECT e.id AS empId, e.code AS empCode, e.department_id AS deptId, d.code AS deptCode,
              COALESCE(e.ngay_nghi_cuoi_thang_truoc, '') AS ngayNghiCuoiThangTruoc
       FROM employees e JOIN departments d ON e.department_id = d.id
       WHERE e.month_id = ?`, monthId
    );

    // Load distribution_results
    const drRows = await conn.all<{ empId: string; day: number; dayType: number }>(
      `SELECT employee_id AS empId, day, day_type AS dayType
       FROM distribution_results WHERE month_id = ? ORDER BY employee_id, day`, monthId
    );

    // Build map: empId → days (1-indexed: day → dayType)
    const empDays = new Map<string, Map<number, number>>();
    // Map: empId → initRun (work days cuối tháng trước)
    const empInitRun = new Map<string, number>();
    const calcConsecutiveDays = (ngayNghi: string): number => {
      if (!ngayNghi) return 0;
      const s = ngayNghi.trim().replace(/^["']|["']$/g, '');
      if (!s) return 0;
      let d: number, m: number, y: number;
      if (s.includes('/')) {
        const parts = s.split('/').map(Number);
        if (parts.length < 2) return 0;
        [d, m, y] = parts;
      } else {
        const parts = s.split('T')[0].split(' ')[0].split('-').map(Number);
        if (parts.length < 3) return 0;
        [y, m, d] = parts;
      }
      const lastDay = new Date(y, m, 0).getDate();
      return Math.max(0, lastDay - d);
    };
    for (const e of empRows) {
      empDays.set(e.empId, new Map());
      empInitRun.set(e.empId, calcConsecutiveDays(e.ngayNghiCuoiThangTruoc));
    }
    for (const r of drRows) {
      empDays.get(r.empId)?.set(r.day, r.dayType);
    }

    // Build map: empId → first PN day (để kiểm tra lp_before_pn)
    const empFirstPn = new Map<string, number>();
    for (const [empId, dayMap] of empDays) {
      let firstPn = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (dayMap.get(d) === 2) { firstPn = d; break; }
      }
      if (firstPn > 0) empFirstPn.set(empId, firstPn);
    }

    // Group by dept
    const deptGroups = new Map<string, { empId: string; code: string }[]>();
    for (const e of empRows) {
      if (skipCodes.has(e.deptCode.toUpperCase())) continue;
      if (!deptGroups.has(e.deptId)) deptGroups.set(e.deptId, []);
      deptGroups.get(e.deptId)!.push({ empId: e.empId, code: e.empCode });
    }

    // Helper: Kiểm tra nếu swap LP→X tại ngày này có vi phạm consecutive không
    // (kiểm tra cả trong tháng và liên tháng)
    const canSwapToWork = (empId: string, day: number): boolean => {
      const dayMap = empDays.get(empId);
      if (!dayMap) return false;
      let runBefore = 0;
      const runStartDay = (() => {
        for (let d = day - 1; d >= 1; d--) {
          if (dayMap.get(d) === 0) runBefore++;
          else return d + 1;
        }
        return 1;
      })();
      let runAfter = 0;
      for (let d = day + 1; d <= daysInMonth; d++) {
        if (dayMap.get(d) === 0) runAfter++;
        else break;
      }
      const totalInMonth = runBefore + 1 + runAfter;
      // Nếu run bắt đầu từ ngày 1, cộng thêm initRun từ tháng trước
      const initRun = runStartDay === 1 ? (empInitRun.get(empId) ?? 0) : 0;
      return (initRun + totalInMonth) <= maxConsec;
    };

    // Helper: Kiểm tra nếu đặt LP (X→LP) tại ngày này có vi phạm lp_before_pn không
    const canSwapToRest = (empId: string, day: number): boolean => {
      const firstPn = empFirstPn.get(empId);
      // Nếu NV không có PN, luôn an toàn
      if (!firstPn) return true;
      // LP chỉ được đặt trước PN
      return day < firstPn;
    };

    const changes: { empId: string; day: number; dayType: number }[] = [];
    let totalViolatingDays = 0;
    let totalFixedDays = 0;

    for (const [, members] of deptGroups) {
      if (members.length < 3) continue;
      const totalMembers = members.length;

      // Xây dailyRest
      const dailyRest: number[] = new Array(daysInMonth + 1).fill(0);
      for (const m of members) {
        const dayMap = empDays.get(m.empId);
        if (!dayMap) continue;
        for (let d = 1; d <= daysInMonth; d++) {
          const dt = dayMap.get(d);
          if (dt !== undefined && dt !== 0) dailyRest[d]++;
        }
      }

      // Ngày đặc biệt (tất cả NV nghỉ)
      const specialDays = new Set<number>();
      for (let d = 1; d <= daysInMonth; d++) {
        if (dailyRest[d] >= totalMembers) specialDays.add(d);
      }
      const checkedDays = daysInMonth - specialDays.size;
      if (checkedDays === 0) continue;

      let totalRest = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (!specialDays.has(d)) totalRest += dailyRest[d];
      }
      const avg = totalRest / checkedDays;

      const underDaySet = new Set<number>();

      for (let round = 0; round < 50; round++) {
        const overDays: number[] = [];
        underDaySet.clear();
        for (let d = 1; d <= daysInMonth; d++) {
          if (specialDays.has(d)) continue;
          if (dailyRest[d] > Math.floor(avg) + params.maxDayOffDifference) overDays.push(d);
          if (dailyRest[d] < Math.ceil(avg) - params.maxDayOffDifference) underDaySet.add(d);
        }
        if (overDays.length === 0 || underDaySet.size === 0) break;

        // Phase 1: Sequential smoothing — direct swap gần nhất
        for (const overDay of [...overDays]) {
          if (underDaySet.size === 0) break;
          if (dailyRest[overDay] <= Math.floor(avg) + params.maxDayOffDifference) continue;

          let bestUnder = -1, bestDist = Infinity;
          for (const ud of underDaySet) {
            const dist = Math.abs(ud - overDay);
            if (dist < bestDist) { bestDist = dist; bestUnder = ud; }
          }
          if (bestUnder === -1) continue;

          const emp = members.find(m => {
            const dm = empDays.get(m.empId);
            return dm && dm.get(overDay) === 1 && dm.get(bestUnder) === 0
              && canSwapToWork(m.empId, overDay)
              && canSwapToRest(m.empId, bestUnder);
          });
          if (!emp) continue;

          const dMap = empDays.get(emp.empId)!;
          dMap.set(overDay, 0);
          dMap.set(bestUnder, 1);
          dailyRest[overDay]--;
          dailyRest[bestUnder]++;
          changes.push({ empId: emp.empId, day: overDay, dayType: 0 });
          changes.push({ empId: emp.empId, day: bestUnder, dayType: 1 });
          totalFixedDays++;

          if (dailyRest[bestUnder] >= Math.ceil(avg) - params.maxDayOffDifference) underDaySet.delete(bestUnder);
        }

        // Phase 2: BFS tìm augmenting path ngắn nhất từ overDay → underDay
        // Không pre-mark overDays đã visited để cho phép đường đi qua overDay làm trung gian
        const visitedDays = new Set<number>();
        const visitedEmps = new Set<string>();
        const parent = new Map<string, string>(); // child → parent
        const queue: string[] = [];

        // Initialize: push employees who have LP on any overDay (thay vì push overDays)
        for (const day of overDays) {
          for (const m of members) {
            if (visitedEmps.has(m.empId)) continue;
            const dayMap = empDays.get(m.empId);
            if (!dayMap || dayMap.get(day) !== 1) continue;
            if (!canSwapToWork(m.empId, day)) continue;
            const empKey = `e:${m.empId}`;
            visitedEmps.add(m.empId);
            parent.set(empKey, `d:${day}`);
            queue.push(empKey);
          }
        }

        let found: string | null = null;

        while (queue.length > 0 && !found) {
          const cur = queue.shift()!;

          if (cur.startsWith('d:')) {
            // Day → Employee: emp có LP trên day này
            const day = parseInt(cur.slice(2));
            if (visitedDays.has(day)) continue;
            visitedDays.add(day);
            for (const m of members) {
              if (visitedEmps.has(m.empId)) continue;
              const dayMap = empDays.get(m.empId);
              if (!dayMap || dayMap.get(day) !== 1) continue;
              if (!canSwapToWork(m.empId, day)) continue;
              const empKey = `e:${m.empId}`;
              visitedEmps.add(m.empId);
              parent.set(empKey, cur);
              queue.push(empKey);
            }
          } else {
            // Employee → Day: emp có X trên day đó
            const empId = cur.slice(2);
            const dayMap = empDays.get(empId);
            if (!dayMap) continue;
            for (let d = 1; d <= daysInMonth; d++) {
              if (visitedDays.has(d)) continue;
              if (dayMap.get(d) !== 0) continue;
              if (!canSwapToRest(empId, d)) continue;
              const dayKey = `d:${d}`;
              if (underDaySet.has(d)) {
                // Tìm thấy! Reconstruct path
                // Path: day → emp → day → emp → ... → day
                // parent: e:empA ← d:7, d:10 ← e:empA, ...
                const path: (number | string)[] = [d];
                let node: string = cur; // starts at emp
                while (node) {
                  if (node.startsWith('e:')) {
                    path.unshift(node.slice(2)); // empId
                  } else {
                    path.unshift(parseInt(node.slice(2))); // day
                  }
                  node = parent.get(node) ?? '';
                }
                // Áp dụng swaps dọc theo path
                // Path[0]=overDay, Path[1]=emp1, Path[2]=day2, Path[3]=emp2, ...
                // Mỗi cặp (emp, leftDay, rightDay): LP(leftDay)→X, X(rightDay)→LP
                for (let i = 1; i < path.length; i += 2) {
                  const empId = path[i] as string;
                  const leftDay = path[i - 1] as number;
                  const rightDay = path[i + 1] as number;
                  const dMap = empDays.get(empId)!;
                  dMap.set(leftDay, 0);
                  dMap.set(rightDay, 1);
                  dailyRest[leftDay]--;
                  dailyRest[rightDay]++;
                  changes.push({ empId, day: leftDay, dayType: 0 });
                  changes.push({ empId, day: rightDay, dayType: 1 });
                  totalFixedDays++;
                }
                found = dayKey;
                break;
              }
              visitedDays.add(d);
              parent.set(dayKey, cur);
              queue.push(dayKey);
            }
          }
        }

        if (!found) break;
      }
    }

    // Đếm số ngày còn vi phạm
    for (const [, members] of deptGroups) {
      if (members.length < 3) continue;
      const totalMembers = members.length;
      const dailyRest: number[] = new Array(daysInMonth + 1).fill(0);
      for (const m of members) {
        const dayMap = empDays.get(m.empId);
        if (!dayMap) continue;
        for (let d = 1; d <= daysInMonth; d++) {
          const dt = dayMap.get(d);
          if (dt !== undefined && dt !== 0) dailyRest[d]++;
        }
      }
      const specialDays = new Set<number>();
      for (let d = 1; d <= daysInMonth; d++) {
        if (dailyRest[d] >= totalMembers) specialDays.add(d);
      }
      const checkedDays = daysInMonth - specialDays.size;
      if (checkedDays === 0) continue;
      let totalRest = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (!specialDays.has(d)) totalRest += dailyRest[d];
      }
      const avg = totalRest / checkedDays;
      for (let d = 1; d <= daysInMonth; d++) {
        if (specialDays.has(d)) continue;
        const dev = dailyRest[d] - avg;
        if (dev > params.maxDayOffDifference || dev < -params.maxDayOffDifference) totalViolatingDays++;
      }
    }

    if (changes.length === 0) {
      await conn.close();
      return NextResponse.json({
        ok: true, fixed: 0, total: totalViolatingDays,
        message: totalViolatingDays === 0
          ? 'Không có vi phạm cân bằng ngày nghỉ'
          : 'Có vi phạm nhưng không thể swap (sẽ vi phạm consecutive)',
      });
    }

    await conn.run('BEGIN TRANSACTION');
    try {
      for (const c of changes) {
        await conn.run(
          `UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`,
          c.dayType, monthId, c.empId, c.day
        );
      }
      await conn.run('COMMIT');
    } catch (e) {
      await conn.run('ROLLBACK');
      throw e;
    }

    await conn.close();
    return NextResponse.json({
      ok: true, fixed: totalFixedDays, total: totalViolatingDays,
      changes: changes.length,
      message: `Đã sửa ${totalFixedDays} ngày vi phạm bằng cách swap X ↔ LP giữa các ngày`,
    });
  } catch (e) {
    await conn.close();
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
