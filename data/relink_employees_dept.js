/**
 * Chạy script này để re-link employees với departments dựa trên ma_pb đã lưu
 * Nếu department_id trống nhưng special_group trùng với dept.code → update
 */
const { Database } = require('duckdb-async');
const path = require('path');

async function main() {
  const db = await Database.create(path.join(process.cwd(), 'data', 'costco.duckdb'));
  const conn = await db.connect();

  // Lấy danh sách departments
  const depts = await conn.all("SELECT id, code FROM departments");
  const deptMap = {};
  depts.forEach(d => { deptMap[d.code.toUpperCase()] = d.id; });
  console.log(`Found ${depts.length} departments:`, Object.keys(deptMap).join(', '));

  // Lấy employees chưa có department_id
  const emps = await conn.all("SELECT id, code, special_group FROM employees WHERE department_id = '' OR department_id IS NULL");
  console.log(`Employees without dept: ${emps.length}`);

  let updated = 0;
  for (const e of emps) {
    const sg = (e.special_group || '').toUpperCase();
    if (deptMap[sg]) {
      await conn.run("UPDATE employees SET department_id=? WHERE id=?", deptMap[sg], e.id);
      updated++;
      console.log(`  Linked ${e.code} → ${sg} (${deptMap[sg]})`);
    }
  }

  console.log(`Updated ${updated} employees.`);
  await conn.close();
  await db.close();
}
main().catch(console.error);
