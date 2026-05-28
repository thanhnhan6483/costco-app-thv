import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from 'duckdb-async';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const id = 'month_master';

const db = await Database.create(path.join(__dirname, '..', 'data', 'costco.duckdb'));
const conn = await db.connect();

await conn.run('BEGIN TRANSACTION');
await conn.run(`DELETE FROM departments          WHERE month_id = ?`, id);
await conn.run(`DELETE FROM shifts               WHERE month_id = ?`, id);
await conn.run(`DELETE FROM leave_types          WHERE month_id = ?`, id);
await conn.run(`DELETE FROM special_groups       WHERE month_id = ?`, id);
await conn.run(`DELETE FROM alloc_rules          WHERE month_id = ?`, id);
await conn.run(`DELETE FROM employees            WHERE month_id = ?`, id);
await conn.run(`DELETE FROM distribution_results WHERE month_id = ?`, id);
await conn.run(`DELETE FROM distribution_status  WHERE month_id = ?`, id);
await conn.run(`DELETE FROM months               WHERE id = ?`, id);
await conn.run('COMMIT');

await conn.close();
console.log('Done. Đã xóa tháng', id, 'và toàn bộ dữ liệu liên quan.');
