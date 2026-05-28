/**
 * POST /api/months/fix-constraints
 * Force rebuild tất cả bảng config để xóa UNIQUE constraint cũ trên code.
 * Chạy 1 lần sau khi upgrade.
 */
import { NextResponse } from 'next/server';
import { getConn, DEFAULT_MONTH_ID } from '@/lib/db';

export const runtime = 'nodejs';

const TABLES = [
  {
    name: 'departments',
    ddl: `CREATE TABLE departments (
      id         VARCHAR PRIMARY KEY,
      month_id   VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      code       VARCHAR NOT NULL,
      name       VARCHAR NOT NULL,
      parent_id  VARCHAR DEFAULT NULL,
      active     BOOLEAN DEFAULT TRUE,
      note       VARCHAR DEFAULT '',
      created_at VARCHAR NOT NULL
    )`,
    cols: 'id, month_id, code, name, parent_id, active, note, created_at',
  },
  {
    name: 'leave_types',
    ddl: `CREATE TABLE leave_types (
      id          VARCHAR PRIMARY KEY,
      month_id    VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      code        VARCHAR NOT NULL,
      name        VARCHAR NOT NULL,
      description VARCHAR DEFAULT '',
      paid        BOOLEAN DEFAULT TRUE,
      note        VARCHAR DEFAULT '',
      created_at  VARCHAR NOT NULL
    )`,
    cols: 'id, month_id, code, name, description, paid, note, created_at',
  },
  {
    name: 'special_groups',
    ddl: `CREATE TABLE special_groups (
      id         VARCHAR PRIMARY KEY,
      month_id   VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      code       VARCHAR NOT NULL,
      name       VARCHAR NOT NULL,
      work_hours DOUBLE DEFAULT 8.0,
      note       VARCHAR DEFAULT '',
      created_at VARCHAR NOT NULL
    )`,
    cols: 'id, month_id, code, name, work_hours, note, created_at',
  },
];

export async function POST() {
  const conn = await getConn();
  const results: Record<string, string> = {};

  for (const tbl of TABLES) {
    try {
      // Luôn rebuild để đảm bảo không còn UNIQUE constraint cũ
      await conn.run(`ALTER TABLE ${tbl.name} RENAME TO ${tbl.name}_bak`);
      await conn.run(tbl.ddl);
      await conn.run(`INSERT INTO ${tbl.name} SELECT ${tbl.cols} FROM ${tbl.name}_bak`);
      await conn.run(`DROP TABLE ${tbl.name}_bak`);
      results[tbl.name] = 'rebuilt OK';
    } catch (e) {
      // Có thể đã rebuild rồi (không còn _bak), thử cleanup
      try { await conn.run(`DROP TABLE IF EXISTS ${tbl.name}_bak`); } catch { /* ignore */ }
      results[tbl.name] = 'skip: ' + String(e).slice(0, 80);
    }
  }

  await conn.close();
  return NextResponse.json({ ok: true, results });
}
