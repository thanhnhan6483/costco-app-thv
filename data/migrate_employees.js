const { Database } = require('duckdb-async');
const path = require('path');

async function main() {
  const db = await Database.create(path.join(process.cwd(), 'data', 'costco.duckdb'));
  const conn = await db.connect();

  const cols = await conn.all("SELECT column_name FROM information_schema.columns WHERE table_name='employees'");
  const names = cols.map(c => c.column_name);

  // Thêm cột ma_pb (lưu raw Mã PB từ Excel)
  if (!names.includes('ma_pb')) {
    await conn.run("ALTER TABLE employees ADD COLUMN ma_pb VARCHAR DEFAULT ''");
    console.log('✅ Added ma_pb');
  } else {
    console.log('  ma_pb already exists');
  }

  // Thử re-link: với mọi employee chưa có department_id,
  // nếu special_group trùng dept.code → cập nhật department_id
  const depts = await conn.all("SELECT id, code FROM departments");
  const deptMap = {};
  depts.forEach(d => { deptMap[d.code.toUpperCase()] = d.id; });

  // Re-link qua ma_pb trước, rồi special_group
  const emps = await conn.all(
    "SELECT id, code, ma_pb, special_group FROM employees WHERE department_id = '' OR department_id IS NULL"
  );
  console.log(`Employees without dept: ${emps.length}`);

  let updated = 0;
  for (const e of emps) {
    const tryCode = (e.ma_pb || e.special_group || '').toUpperCase();
    if (tryCode && deptMap[tryCode]) {
      await conn.run("UPDATE employees SET department_id=?, ma_pb=? WHERE id=?", deptMap[tryCode], tryCode, e.id);
      updated++;
      console.log(`  Linked ${e.code} → ${tryCode}`);
    }
  }
  console.log(`Updated ${updated} employees.`);

  await conn.close();
  await db.close();
}
main().catch(console.error);
