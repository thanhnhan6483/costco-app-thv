import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from 'duckdb-async';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FROM = '1779071988703'; // Tháng 6/2025
const TO   = 'month_master';
const now  = new Date().toISOString().slice(0, 10);

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const db = await Database.create(path.join(__dirname, '..', 'data', 'costco.duckdb'));
const conn = await db.connect();

// Kiểm tra tháng đích đã tồn tại chưa
const existing = await conn.all(`SELECT id FROM months WHERE id = ?`, TO);
if (existing.length > 0) {
  console.log('Tháng month_master đã tồn tại, bỏ qua.');
  await conn.close(); process.exit(0);
}

await conn.run('BEGIN TRANSACTION');

// Tạo tháng master locked=TRUE
await conn.run(
  `INSERT INTO months (id, label, month, from_date, to_date, note, locked, created_at)
   VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)`,
  TO, 'Tháng 01/2026 (Master)', '01/2026', '01/01/2026', '31/01/2026',
  'Dữ liệu master – không xóa được', now
);

// 1. Departments
const depts = await conn.all(`SELECT id, code, name, parent_id, active, note FROM departments WHERE month_id = ?`, FROM);
const deptIdMap = {};
for (const d of depts) deptIdMap[d.id] = newId('d');
for (const d of depts) {
  const parentId = d.parent_id ? (deptIdMap[d.parent_id] ?? null) : null;
  await conn.run(
    `INSERT INTO departments (id, month_id, code, name, parent_id, active, note, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    deptIdMap[d.id], TO, d.code, d.name, parentId, d.active, d.note, now
  );
}

// 2. Shifts
const shifts = await conn.all(`SELECT * FROM shifts WHERE month_id = ?`, FROM);
for (const s of shifts) {
  const newDeptId = s.department_id ? (deptIdMap[s.department_id] ?? null) : null;
  await conn.run(
    `INSERT INTO shifts (id, month_id, name, department_id, is_default, shift_type,
       window_start, clock_in, clock_out, window_end, late_minutes, ot_threshold, ot_calc, note, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    newId('s'), TO, s.name, newDeptId, s.is_default, s.shift_type,
    s.window_start, s.clock_in, s.clock_out, s.window_end,
    s.late_minutes, s.ot_threshold, s.ot_calc, s.note, now
  );
}

// 3. Leave Types
const lts = await conn.all(`SELECT code, name, description, paid, note FROM leave_types WHERE month_id = ?`, FROM);
for (const lt of lts) {
  await conn.run(
    `INSERT INTO leave_types (id, month_id, code, name, description, paid, note, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    newId('lt'), TO, lt.code, lt.name, lt.description, lt.paid, lt.note, now
  );
}

// 4. Special Groups
const sgs = await conn.all(`SELECT code, name, work_hours, note FROM special_groups WHERE month_id = ?`, FROM);
for (const sg of sgs) {
  await conn.run(
    `INSERT INTO special_groups (id, month_id, code, name, work_hours, note, created_at) VALUES (?,?,?,?,?,?,?)`,
    newId('sg'), TO, sg.code, sg.name, sg.work_hours, sg.note, now
  );
}

// 5. Alloc Rules
const ars = await conn.all(`SELECT group_code, group_name, name, param_key, param_value, default_param, specific_value, description, active FROM alloc_rules WHERE month_id = ?`, FROM);
for (const ar of ars) {
  await conn.run(
    `INSERT INTO alloc_rules (id, month_id, group_code, group_name, name, param_key, param_value,
       default_param, specific_value, description, active, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    newId('ar'), TO, ar.group_code, ar.group_name, ar.name, ar.param_key, ar.param_value,
    ar.default_param, ar.specific_value, ar.description, ar.active, now
  );
}

// 6. Employees (copy luôn vì là master)
const emps = await conn.all(`SELECT * FROM employees WHERE month_id = ?`, FROM);
const empCols = Object.keys(emps[0] || {}).filter(c => c !== 'id' && c !== 'month_id');
for (const e of emps) {
  const newEmpId = newId('emp');
  const vals = empCols.map(c => e[c]);
  await conn.run(
    `INSERT INTO employees (id, month_id, ${empCols.join(',')}) VALUES (?,?,${empCols.map(() => '?').join(',')})`,
    newEmpId, TO, ...vals
  );
}

await conn.run('COMMIT');
await conn.close();

console.log(`Done. Tạo tháng master month_master từ tháng 6/2025:`);
console.log(`  Departments: ${depts.length}, Shifts: ${shifts.length}, LeaveTypes: ${lts.length}`);
console.log(`  SpecialGroups: ${sgs.length}, AllocRules: ${ars.length}, Employees: ${emps.length}`);
