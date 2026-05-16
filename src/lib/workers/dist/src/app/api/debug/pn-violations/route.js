"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
const CODES = ['170002', '170004', '170016', '170019', '170022', '170024', '170025', '170044'];
const SYM = ['X', 'LP', 'PN', 'Ô', 'TS', 'DS', 'O', 'NL', 'OF', 'P'];
async function GET(req) {
    const monthId = req.nextUrl.searchParams.get('month') ?? '';
    const conn = await (0, db_1.getConn)();
    // Lấy dữ liệu distribution_results
    const rows = await conn.all(`
    SELECT e.code, e.name, d.name AS dept_name,
           dr.day, dr.day_type, e.workdays
    FROM distribution_results dr
    JOIN employees e ON dr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE e.code IN (${CODES.map(c => `'${c}'`).join(',')})
    ${monthId ? `AND dr.month_id = '${monthId}'` : ''}
    ORDER BY e.code, dr.day
  `);
    // Lấy dữ liệu import gốc (các cột day_1..day_31)
    const importRows = await conn.all(`
    SELECT code,
      day_15, day_16, day_17, day_18, day_19, day_20,
      day_21, day_22, day_23, day_24, day_25, day_26,
      day_27, day_28, day_29, day_30, day_31,
      workdays, phep_nam
    FROM employees
    WHERE code IN (${CODES.map(c => `'${c}'`).join(',')})
    ${monthId ? `AND month_id = '${monthId}'` : ''}
  `);
    await conn.close();
    const emps = {};
    for (const r of rows) {
        if (!emps[r.code])
            emps[r.code] = {
                code: r.code, name: r.name, dept: r.dept_name,
                workdays: r.workdays, days: new Array(31).fill(null),
            };
        emps[r.code].days[r.day - 1] = r.day_type;
    }
    const results = Object.values(emps).map((emp) => {
        const days = emp.days;
        const pnIdx = days.findIndex(d => d === 2);
        const pnDay = pnIdx + 1;
        // LP runs từ ngày 15 (idx 14)
        const runs = [];
        let runStart = -1;
        for (let i = 14; i < 31; i++) {
            if (days[i] === 1) {
                if (runStart === -1)
                    runStart = i;
            }
            else {
                if (runStart !== -1) {
                    runs.push({ start: runStart + 1, end: i, len: i - runStart });
                    runStart = -1;
                }
            }
        }
        if (runStart !== -1) {
            runs.push({ start: runStart + 1, end: 31, len: 31 - runStart });
        }
        runs.sort((a, b) => b.len - a.len || b.end - a.end);
        const prevType = pnIdx > 0 ? days[pnIdx - 1] : null;
        const violation = prevType !== 1;
        // Chuỗi ký hiệu ngày 1-31
        const dayRow = days.map((t, i) => {
            const s = t !== null ? (SYM[t] ?? '?') : '_';
            return `${i + 1}:${s}`;
        }).join(' ');
        return {
            code: emp.code, name: emp.name, dept: emp.dept,
            workdays: emp.workdays,
            pnDay,
            prevDaySym: prevType !== null ? (SYM[prevType] ?? '?') : 'N/A',
            prevDayCode: prevType,
            violation,
            lpRunsFrom15: runs,
            bestRun: runs[0] ?? null,
            dayRow,
        };
    });
    const importMap = {};
    for (const r of importRows)
        importMap[r.code] = r;
    return server_1.NextResponse.json({
        count: results.length,
        results: results.map(r => ({
            ...r,
            importDays: importMap[r.code] ?? null,
        })),
    });
}
