const { Database } = require('duckdb-async');
const path = require('path');
async function main() {
  const db = await Database.create(path.join(process.cwd(), 'data', 'costco.duckdb'));
  const conn = await db.connect();

  // ma_pb hiện có
  const maPbRows = await conn.all("SELECT DISTINCT ma_pb FROM employees WHERE ma_pb IS NOT NULL AND ma_pb != '' LIMIT 20");
  console.log('Distinct ma_pb in employees:', maPbRows.map(r => r.ma_pb).join(', ') || '(none)');

  // dept codes
  const depts = await conn.all('SELECT code FROM departments');
  console.log('All dept codes:', depts.map(d => d.code).join(', '));

  // Count employees without dept
  const cnt = await conn.all("SELECT COUNT(*) AS n FROM employees WHERE department_id = '' OR department_id IS NULL");
  console.log('Employees without dept:', cnt[0].n);

  // Thử relink
  const deptMap = {};
  depts.forEach(d => { deptMap[d.code.toUpperCase()] = d.id; });

  const toLink = await conn.all("SELECT id, code, ma_pb FROM employees WHERE (department_id = '' OR department_id IS NULL) AND ma_pb != ''");
  console.log('Can try to link:', toLink.length, 'employees');

  let linked = 0;
  for (const e of toLink) {
    const id = deptMap[(e.ma_pb || '').toUpperCase()];
    if (id) {
      await conn.run('UPDATE employees SET department_id=? WHERE id=?', id, e.id);
      linked++;
    }
  }
  console.log('Linked:', linked);

  await conn.close();
  await db.close();
}
main().catch(console.error);
