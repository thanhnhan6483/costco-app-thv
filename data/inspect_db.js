const { Database } = require('duckdb-async');
const path = require('path');
async function main() {
  const db = await Database.create(path.join(process.cwd(), 'data', 'costco.duckdb'));
  const conn = await db.connect();
  // Xem sample columns của employees
  const cols = await conn.all("SELECT column_name FROM information_schema.columns WHERE table_name='employees'");
  console.log('Columns:', cols.map(c => c.column_name).join(', '));
  // Sample 3 rows
  const rows = await conn.all("SELECT id, code, name, department_id, ma_pb, special_group, created_at FROM employees LIMIT 3");
  rows.forEach(r => console.log(JSON.stringify(r)));
  // Sources - check created_at
  const dates = await conn.all("SELECT created_at, COUNT(*) AS cnt FROM employees GROUP BY created_at ORDER BY cnt DESC LIMIT 5");
  console.log('Created dates:', JSON.stringify(dates));
  await conn.close(); await db.close();
}
main().catch(console.error);
