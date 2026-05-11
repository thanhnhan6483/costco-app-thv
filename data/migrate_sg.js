const { Database } = require('duckdb-async');
const path = require('path');

async function main() {
  const DB_PATH = path.join(process.cwd(), 'data', 'costco.duckdb');
  const db = await Database.create(DB_PATH);
  const conn = await db.connect();
  
  // Kiểm tra cột
  const cols = await conn.all("SELECT column_name FROM information_schema.columns WHERE table_name='special_groups'");
  console.log('Current columns:', cols.map(c => c.column_name).join(', '));
  
  const hasWorkHours = cols.some(c => c.column_name === 'work_hours');
  if (!hasWorkHours) {
    await conn.run("ALTER TABLE special_groups ADD COLUMN work_hours DECIMAL(4,1) DEFAULT 8.0");
    console.log('✅ Added work_hours column');
  } else {
    console.log('✅ work_hours already exists');
  }
  
  // Cập nhật các nhóm đã có
  await conn.run("UPDATE special_groups SET work_hours=6.0 WHERE code='PREG'");
  await conn.run("UPDATE special_groups SET work_hours=7.0 WHERE code='DISAB'");
  await conn.run("UPDATE special_groups SET work_hours=6.0 WHERE code='LD'");
  await conn.run("UPDATE special_groups SET work_hours=4.0 WHERE code='PART'");
  await conn.run("UPDATE special_groups SET work_hours=8.0 WHERE code='STD'");
  
  const all = await conn.all("SELECT code, name, work_hours FROM special_groups");
  console.log('Data:', JSON.stringify(all));
  
  await conn.close();
  await db.close();
}

main().catch(console.error);
