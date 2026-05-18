import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from 'duckdb-async';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fromDb(v) {
  if (!v) return '';
  try { return Buffer.from(String(v), 'latin1').toString('utf8'); } catch { return String(v); }
}

const db = await Database.create(path.join(__dirname, '..', 'data', 'costco.duckdb'));
const conn = await db.connect();
const rows = await conn.all('SELECT id, group_code, group_name, name, default_param, specific_value, description FROM alloc_rules');
let updated = 0;
for (const r of rows) {
  await conn.run(
    'UPDATE alloc_rules SET group_code=?, group_name=?, name=?, default_param=?, specific_value=?, description=? WHERE id=?',
    fromDb(r.group_code), fromDb(r.group_name), fromDb(r.name),
    fromDb(r.default_param), fromDb(r.specific_value), fromDb(r.description),
    r.id
  );
  updated++;
}
await conn.close();
console.log('Done. Updated:', updated, 'rows');
