import duckdb from 'duckdb';

const db = new duckdb.Database('data/costco.duckdb');
const conn = db.connect();

const CODES = ['170002','170004','170016','170019','170022','170024','170025','170044'];

conn.all(`
  SELECT 
    e.code, e.name,
    d.name AS dept_name,
    dr.day, dr.day_type,
    e.workdays,
    e.ngay_nghi_cuoi_thang_truoc
  FROM distribution_results dr
  JOIN employees e ON dr.employee_id = e.id
  JOIN departments d ON e.department_id = d.id
  WHERE e.code IN (${CODES.map(c => `'${c}'`).join(',')})
  AND dr.month_id = (SELECT month_id FROM distribution_results LIMIT 1)
  ORDER BY e.code, dr.day
`, (err, rows) => {
  if (err) {
    // Try without month_id filter
    conn.all(`
      SELECT 
        e.code, e.name,
        d.name AS dept_name,
        dr.day, dr.day_type,
        e.workdays
      FROM distribution_results dr
      JOIN employees e ON dr.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      WHERE e.code IN (${CODES.map(c => `'${c}'`).join(',')})
      ORDER BY e.code, dr.day
    `, (err2, rows2) => {
      if (err2) { console.error('DB error:', err2); db.close(); return; }
      analyze(rows2);
    });
    return;
  }
  analyze(rows);
});

function analyze(rows) {
  if (!rows || rows.length === 0) {
    console.log('Không có dữ liệu. Kiểm tra lại month_id hoặc mã NV.');
    db.close();
    return;
  }

  const SYM = ['X','LP','PN','O','TS','DS','O','NL','OF','P'];

  // Group by employee
  const emps = {};
  rows.forEach(r => {
    if (!emps[r.code]) emps[r.code] = {
      name: r.name, dept: r.dept_name,
      workdays: r.workdays,
      days: new Array(31).fill(null)
    };
    emps[r.code].days[r.day - 1] = r.day_type;
  });

  Object.entries(emps).forEach(([code, emp]) => {
    const days = emp.days;
    const pnIdx = days.findIndex(d => d === 2);
    const pnDay = pnIdx + 1;

    // LP runs từ ngày 15 (index 14)
    const runs = [];
    let runStart = -1;
    for (let i = 14; i < 31; i++) {
      if (days[i] === 1) {
        if (runStart === -1) runStart = i;
      } else {
        if (runStart !== -1) {
          runs.push({ start: runStart + 1, end: i, len: i - runStart });
          runStart = -1;
        }
      }
    }
    if (runStart !== -1) runs.push({ start: runStart + 1, end: 31, len: 31 - runStart });

    // Sort như algorithm: longest first, then latest
    runs.sort((a, b) => b.len - a.len || b.end - a.end);
    const bestRun = runs[0];

    // Chuỗi ngày 13-31
    let dayStr = '';
    for (let i = 12; i < 31; i++) {
      const t = days[i];
      const sym = t !== null ? (SYM[t] || '?'+t) : '_';
      const marker = (i === pnIdx) ? `[${sym}]` : sym;
      dayStr += `${i+1}:${marker} `;
    }

    const prevDay = pnIdx > 0 ? days[pnIdx - 1] : null;
    const violation = prevDay !== 1;

    console.log(`\n━━ ${code} ${emp.name} [${emp.dept}] workdays=${emp.workdays} ━━`);
    console.log(`Ngày 13-31: ${dayStr}`);
    console.log(`PN ngày: ${pnDay} | Ngày ${pnDay-1}=${SYM[prevDay]??'?'} | VI PHẠM: ${violation ? 'CÓ ❌' : 'KHÔNG ✓'}`);
    console.log(`LP runs từ ngày 15: ${JSON.stringify(runs)}`);
    console.log(`Best run cho PN: ${bestRun ? `ngày ${bestRun.start}-${bestRun.end} (dài ${bestRun.len})` : 'KHÔNG CÓ'}`);
    if (bestRun) {
      console.log(`→ placePNAtEndOfRestPeriod sẽ đặt PN tại ngày ${bestRun.end} (end of run)`);
      if (bestRun.len === 1) {
        console.log(`⚠️  Run chỉ dài 1 ngày → PN đứng cô lập!`);
      }
    }
  });

  db.close();
}
