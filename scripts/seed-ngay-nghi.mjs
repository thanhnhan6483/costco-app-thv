/**
 * Script: seed-ngay-nghi.mjs
 * Gán ngẫu nhiên ngay_nghi_cuoi_thang_truoc cho ~1000 NV của tháng hiện tại.
 * Ngày ngẫu nhiên trong khoảng 26/09/2025 – 30/09/2025.
 * Chạy: node scripts/seed-ngay-nghi.mjs [monthId]
 */
import { Database } from 'duckdb-async';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'data', 'costco.duckdb');
const MONTH_ID  = process.argv[2] ?? 'month_jan2026';
const TARGET    = 1000; // số NV có ngày nghỉ

const DAYS = ['26/09/2025','27/09/2025','28/09/2025','29/09/2025','30/09/2025'];
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

const db   = await Database.create(DB_PATH);
const conn = await db.connect();

// 1. Đặt tất cả về rỗng trước
await conn.run(`UPDATE employees SET ngay_nghi_cuoi_thang_truoc = '' WHERE month_id = ?`, MONTH_ID);

// 2. Lấy tất cả employee id
const emps = await conn.all(`SELECT id FROM employees WHERE month_id = ? ORDER BY code`, MONTH_ID);
console.log(`Tổng NV: ${emps.length}`);

// 3. Chọn ngẫu nhiên TARGET NV (không trùng)
const count = Math.min(TARGET, emps.length);
const shuffled = [...emps].sort(() => Math.random() - 0.5).slice(0, count);

// 4. Update
let updated = 0;
for (const emp of shuffled) {
  await conn.run(
    `UPDATE employees SET ngay_nghi_cuoi_thang_truoc = ? WHERE id = ?`,
    rand(DAYS), emp.id
  );
  updated++;
}

await conn.close();
console.log(`✅ Đã gán ngày nghỉ CTT cho ${updated}/${emps.length} NV (${MONTH_ID})`);
console.log(`   Phân bố: mỗi ngày trong 26–30/09/2025 (~${Math.round(updated/5)} NV/ngày)`);
