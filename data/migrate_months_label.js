const { Database } = require('duckdb-async');
const path = require('path');

async function main() {
  const DB_PATH = path.join(process.cwd(), 'data', 'costco.duckdb');
  const db = await Database.create(DB_PATH);
  const conn = await db.connect();

  // Kiểm tra cột hiện tại của months
  const cols = await conn.all(
    "SELECT column_name FROM information_schema.columns WHERE table_name='months'"
  );
  const colNames = cols.map(c => c.column_name);
  console.log('months columns:', colNames.join(', '));

  // Thêm cột label nếu chưa có
  if (!colNames.includes('label')) {
    await conn.run("ALTER TABLE months ADD COLUMN label VARCHAR DEFAULT ''");
    console.log('✅ Added label column to months');
  } else {
    console.log('✅ label already exists');
  }

  // Xác nhận
  const rows = await conn.all("SELECT id, label, month FROM months ORDER BY month DESC");
  console.log('Data:', JSON.stringify(rows, null, 2));

  await conn.close();
  await db.close();
}

main().catch(console.error);
