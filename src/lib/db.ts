/**
 * src/lib/db.ts
 * Singleton DuckDB connection cho toàn bộ ứng dụng COSTCO.
 * Dữ liệu được lưu cục bộ tại: <project-root>/data/costco.duckdb
 *
 * v2: Mỗi bảng cấu hình có cột month_id → cấu hình độc lập theo từng Tháng chấm công.
 *     Dữ liệu cũ (không có month_id) sẽ được gắn vào tháng 'month_master' (01/2026).
 */
import path from 'path';
import { Database, Connection } from 'duckdb-async';
import { DEFAULT_MONTH_ID } from './constants';
import bcrypt from 'bcryptjs';

// Re-export for API routes that import from db.ts
export { DEFAULT_MONTH_ID } from './constants';

const DB_PATH = path.join(process.cwd(), 'data', 'costco.duckdb');

// Singleton instance (shared across hot-reload in dev via globalThis)
declare global {
  // eslint-disable-next-line no-var
  var __duckdb: Database | undefined;
}

async function getDb(): Promise<Database> {
  if (!globalThis.__duckdb) {
    globalThis.__duckdb = await Database.create(DB_PATH);
    await initSchema(globalThis.__duckdb);
    // Flush WAL vào file chính để tránh lỗi IO khi khởi động lại
    const conn = await globalThis.__duckdb.connect();
    await conn.run('CHECKPOINT');
    await conn.close();
  }
  return globalThis.__duckdb;
}

export async function getConn(): Promise<Connection> {
  const db = await getDb();
  return db.connect();
}

/* ─── Schema & seed ──────────────────────────────────────── */
async function initSchema(db: Database): Promise<void> {
  const conn = await db.connect();

  /* months – Tháng chấm công (bảng gốc, không có month_id) */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS months (
      id          VARCHAR PRIMARY KEY,
      label       VARCHAR DEFAULT '',
      month       VARCHAR NOT NULL UNIQUE,     -- 'MM/YYYY'
      from_date   VARCHAR NOT NULL,            -- 'DD/MM/YYYY'
      to_date     VARCHAR NOT NULL,            -- 'DD/MM/YYYY'
      note        VARCHAR DEFAULT '',
      locked      BOOLEAN DEFAULT FALSE,
      created_at  VARCHAR NOT NULL
    )
  `);

  /* Migrate months: thêm cột label nếu thiếu */
  try {
    const mCols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='months'`
    );
    const mNames = mCols.map(c => c.column_name);
    if (!mNames.includes('label')) {
      await conn.run(`ALTER TABLE months ADD COLUMN label VARCHAR DEFAULT ''`);
    }
    if (!mNames.includes('locked')) {
      await conn.run(`ALTER TABLE months ADD COLUMN locked BOOLEAN DEFAULT FALSE`);
    }
  } catch { /* bảng chưa tồn tại */ }

  /* Tháng mặc định sẽ được tạo trong seedIfEmpty() nếu DB trống */
  /* Không tự động tạo lại nếu user đã xóa */

  /* departments – Phòng ban */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id        VARCHAR PRIMARY KEY,
      month_id  VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      code      VARCHAR NOT NULL,
      name      VARCHAR NOT NULL,
      parent_id VARCHAR DEFAULT NULL,
      active    BOOLEAN DEFAULT TRUE,
      note      VARCHAR DEFAULT '',
      created_at VARCHAR NOT NULL
    )
  `);

  /* Migrate departments: thêm các cột mới nếu thiếu */
  try {
    const deptCols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='departments'`
    );
    const names = deptCols.map(c => c.column_name);
    if (!names.includes('month_id')) {
      await conn.run(`ALTER TABLE departments ADD COLUMN month_id VARCHAR DEFAULT '${DEFAULT_MONTH_ID}'`);
      // Gắn dữ liệu cũ vào tháng mặc định
      await conn.run(`UPDATE departments SET month_id = '${DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
    }
    if (!names.includes('parent_id')) {
      await conn.run(`ALTER TABLE departments ADD COLUMN parent_id VARCHAR DEFAULT NULL`);
    }
  } catch { /* bảng chưa tồn tại */ }

  /* Xóa UNIQUE constraint cũ trên code (nếu có) bằng cách rebuild bảng.
     DuckDB không hỗ trợ DROP CONSTRAINT, nên dùng RENAME + CREATE + INSERT + DROP */
  try {
    // Thử INSERT trùng code vào tháng khác – nếu lỗi UNIQUE thì cần rebuild
    const testId = '__constraint_test__';
    const testMonth = '__test_month__';
    await conn.run(
      `INSERT INTO departments (id, month_id, code, name, created_at) VALUES (?, ?, 'KD', '__test__', '2000-01-01')`,
      testId, testMonth
    );
    // Thành công → constraint đã đúng, xóa row test
    await conn.run(`DELETE FROM departments WHERE id = ?`, testId);
  } catch {
    // Lỗi UNIQUE → rebuild bảng với composite key (month_id, code)
    try {
      await conn.run(`ALTER TABLE departments RENAME TO departments_old`);
      await conn.run(`
        CREATE TABLE departments (
          id         VARCHAR PRIMARY KEY,
          month_id   VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
          code       VARCHAR NOT NULL,
          name       VARCHAR NOT NULL,
          parent_id  VARCHAR DEFAULT NULL,
          active     BOOLEAN DEFAULT TRUE,
          note       VARCHAR DEFAULT '',
          created_at VARCHAR NOT NULL
        )
      `);
      await conn.run(`INSERT INTO departments SELECT id, month_id, code, name, parent_id, active, note, created_at FROM departments_old`);
      await conn.run(`DROP TABLE departments_old`);
    } catch { /* ignore rebuild error */ }
  }

  /* shifts – Ca làm việc */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id              VARCHAR PRIMARY KEY,
      month_id        VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      name            VARCHAR NOT NULL,
      department      VARCHAR DEFAULT '',
      department_id   VARCHAR DEFAULT NULL,
      is_default      BOOLEAN DEFAULT FALSE,
      shift_type      VARCHAR DEFAULT 'Ca 1',
      window_start    VARCHAR DEFAULT '',
      clock_in        VARCHAR NOT NULL,
      clock_out       VARCHAR NOT NULL,
      window_end      VARCHAR DEFAULT '',
      late_minutes    INTEGER DEFAULT 0,
      ot_threshold    INTEGER DEFAULT 0,
      ot_calc         VARCHAR DEFAULT 'Tính từ giờ ra (công)',
      note            VARCHAR DEFAULT '',
      created_at      VARCHAR NOT NULL
    )
  `);

  /* Migrate shifts */
  try {
    const shiftCols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='shifts'`
    );
    const names = shiftCols.map(c => c.column_name);
    const newCols: [string, string][] = [
      ['month_id', `VARCHAR DEFAULT '${DEFAULT_MONTH_ID}'`],
      ['department', `VARCHAR DEFAULT ''`],
      ['department_id', `VARCHAR DEFAULT NULL`],
      ['is_default', `BOOLEAN DEFAULT FALSE`],
      ['shift_type', `VARCHAR DEFAULT 'Ca 1'`],
      ['window_start', `VARCHAR DEFAULT ''`],
      ['window_end', `VARCHAR DEFAULT ''`],
      ['late_minutes', `INTEGER DEFAULT 0`],
      ['ot_threshold', `INTEGER DEFAULT 0`],
      ['ot_calc', `VARCHAR DEFAULT 'Tính từ giờ ra (công)'`],
    ];
    for (const [col, def] of newCols) {
      if (!names.includes(col)) {
        await conn.run(`ALTER TABLE shifts ADD COLUMN ${col} ${def}`);
      }
    }
    // Gắn dữ liệu cũ vào tháng mặc định
    await conn.run(`UPDATE shifts SET month_id = '${DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
  } catch { /* bảng chưa tồn tại */ }

  /* leave_types – Loại nghỉ phép */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS leave_types (
      id          VARCHAR PRIMARY KEY,
      month_id    VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      code        VARCHAR NOT NULL,
      name        VARCHAR NOT NULL,
      description VARCHAR DEFAULT '',
      paid        BOOLEAN DEFAULT TRUE,
      note        VARCHAR DEFAULT '',
      created_at  VARCHAR NOT NULL
    )
  `);

  /* Migrate leave_types */
  try {
    const ltCols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='leave_types'`
    );
    const names = ltCols.map(c => c.column_name);
    if (!names.includes('month_id')) {
      await conn.run(`ALTER TABLE leave_types ADD COLUMN month_id VARCHAR DEFAULT '${DEFAULT_MONTH_ID}'`);
      await conn.run(`UPDATE leave_types SET month_id = '${DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
    }
    if (!names.includes('description')) {
      await conn.run(`ALTER TABLE leave_types ADD COLUMN description VARCHAR DEFAULT ''`);
    }
    if (!names.includes('day_type')) {
      await conn.run(`ALTER TABLE leave_types ADD COLUMN day_type INTEGER DEFAULT -1`);
      // Seed giá trị mặc định theo code
      const seedMap: Record<string, number> = {
        X: 0, L: 1, LP: 1, PN: 2, 'Ô': 3, TS: 4, DS: 5, O: 6, NL: 7, OF: 8, P: 9,
        'X/2': 10, LL: 11, LN: 12, H: 13, B: 14,
      };
      for (const [code, dt] of Object.entries(seedMap)) {
        await conn.run(`UPDATE leave_types SET day_type = ? WHERE code = ?`, dt, code);
      }
    }
  } catch { /* bảng chưa tồn tại */ }

  /* special_groups – Nhóm đặc thù */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS special_groups (
      id        VARCHAR PRIMARY KEY,
      month_id  VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      code      VARCHAR NOT NULL,
      name      VARCHAR NOT NULL,
      work_hours DOUBLE DEFAULT 8.0,
      note      VARCHAR DEFAULT '',
      created_at VARCHAR NOT NULL
    )
  `);

  /* Migrate special_groups */
  try {
    const sgCols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='special_groups'`
    );
    const names = sgCols.map(c => c.column_name);
    if (!names.includes('month_id')) {
      await conn.run(`ALTER TABLE special_groups ADD COLUMN month_id VARCHAR DEFAULT '${DEFAULT_MONTH_ID}'`);
      await conn.run(`UPDATE special_groups SET month_id = '${DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
    }
    if (!names.includes('work_hours')) {
      await conn.run(`ALTER TABLE special_groups ADD COLUMN work_hours DOUBLE DEFAULT 8.0`);
    }
  } catch { /* bảng chưa tồn tại */ }

  /* alloc_rules – Quy tắc phân bổ */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS alloc_rules (
      id             VARCHAR PRIMARY KEY,
      month_id       VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      group_code     VARCHAR NOT NULL DEFAULT 'GENERAL',
      group_name     VARCHAR NOT NULL DEFAULT 'Chung',
      name           VARCHAR NOT NULL,
      param_key      VARCHAR DEFAULT '',
      param_value    DOUBLE  DEFAULT NULL,
      default_param  VARCHAR DEFAULT '',
      specific_value VARCHAR DEFAULT '',
      description    VARCHAR DEFAULT '',
      active         BOOLEAN DEFAULT TRUE,
      created_at     VARCHAR NOT NULL
    )
  `);

  /* Migrate alloc_rules – thêm cột mới nếu thiếu */
  try {
    const arCols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='alloc_rules'`
    );
    const names = arCols.map(c => c.column_name);
    if (!names.includes('month_id')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN month_id VARCHAR DEFAULT '${DEFAULT_MONTH_ID}'`);
      await conn.run(`UPDATE alloc_rules SET month_id = '${DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
    }
    if (!names.includes('default_param')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN default_param VARCHAR DEFAULT ''`);
    }
    if (!names.includes('group_code')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN group_code VARCHAR DEFAULT 'GENERAL'`);
    }
    if (!names.includes('group_name')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN group_name VARCHAR DEFAULT 'Chung'`);
    }
    if (!names.includes('specific_value')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN specific_value VARCHAR DEFAULT ''`);
    }
    if (!names.includes('param_key')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN param_key VARCHAR DEFAULT ''`);
    }
    if (!names.includes('param_value')) {
      await conn.run(`ALTER TABLE alloc_rules ADD COLUMN param_value DOUBLE DEFAULT NULL`);
    }
  } catch { /* bảng chưa tồn tại */ }


  /* employees – Nhân viên */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id                        VARCHAR PRIMARY KEY,
      month_id                  VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
      code                      VARCHAR NOT NULL,
      name                      VARCHAR NOT NULL,
      department_id             VARCHAR DEFAULT '',
      ma_pb                     VARCHAR DEFAULT '',
      special_group             VARCHAR DEFAULT '',
      group_code_end_date           VARCHAR DEFAULT '',
      ngay_nghi_cuoi_thang_truoc     VARCHAR DEFAULT '',
      so_ngay_lam_cuoi_thang_truoc   INTEGER DEFAULT 0,
      workdays                       VARCHAR DEFAULT '',
      overtime_hours            VARCHAR DEFAULT '',
      late_minutes              VARCHAR DEFAULT '',
      phep_nam                  VARCHAR DEFAULT '',
      active                    BOOLEAN DEFAULT TRUE,
      created_at                VARCHAR NOT NULL,
      ${Array.from({ length: 31 }, (_, i) => `day_${i + 1} VARCHAR DEFAULT ''`).join(',\n      ')}
    )
  `);

  /* Migrate employees */
  try {
    const eCols = await conn.all<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='employees'`
    );
    const names = eCols.map(c => c.column_name);
    const empNewCols: [string, string][] = [
      ['month_id', `VARCHAR DEFAULT '${DEFAULT_MONTH_ID}'`],
      ['ma_pb', `VARCHAR DEFAULT ''`],
      ['group_code_end_date', `VARCHAR DEFAULT ''`],
      ['department_id', `VARCHAR DEFAULT ''`],
      ['ngay_nghi_cuoi_thang_truoc', `VARCHAR DEFAULT ''`],
      ['so_ngay_lam_cuoi_thang_truoc', `INTEGER DEFAULT 0`],
      ['workdays', `VARCHAR DEFAULT ''`],
      ['overtime_hours', `VARCHAR DEFAULT ''`],
      ['late_minutes', `VARCHAR DEFAULT ''`],
      ['phep_nam', `VARCHAR DEFAULT ''`],
    ];
    for (const [col, def] of empNewCols) {
      if (!names.includes(col)) {
        await conn.run(`ALTER TABLE employees ADD COLUMN ${col} ${def}`);
      }
    }
    // Migrate: đổi tên cột cũ → tên mới nếu cột cũ vẫn còn
    if (names.includes('nghi_cuoi_thang_truoc') && !names.includes('ngay_nghi_cuoi_thang_truoc')) {
      await conn.run(`ALTER TABLE employees RENAME COLUMN nghi_cuoi_thang_truoc TO ngay_nghi_cuoi_thang_truoc`);
    } else if (names.includes('nghi_cuoi_thang_truoc') && names.includes('ngay_nghi_cuoi_thang_truoc')) {
      // Copy data sang cột mới rồi xóa cột cũ (DuckDB không support DROP COLUMN dễ dàng, bỏ qua)
      await conn.run(`UPDATE employees SET ngay_nghi_cuoi_thang_truoc = nghi_cuoi_thang_truoc WHERE ngay_nghi_cuoi_thang_truoc = ''`);
    }
    // Thêm cột day_1..day_31 nếu thiếu
    for (let i = 1; i <= 31; i++) {
      const col = `day_${i}`;
      if (!names.includes(col)) {
        await conn.run(`ALTER TABLE employees ADD COLUMN ${col} VARCHAR DEFAULT ''`);
      }
    }
    // Gắn dữ liệu cũ vào tháng mặc định
    await conn.run(`UPDATE employees SET month_id = '${DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
  } catch { /* bảng chưa tồn tại */ }

  /* Xóa UNIQUE(code, month_id) nếu tồn tại — rebuild bảng không có constraint này.
     Kiểm tra bằng cách thử insert 2 dòng cùng code+month_id. */
  try {
    const t1 = '__rm_uq_1__', t2 = '__rm_uq_2__', tm = '__rm_uq_month__';
    await conn.run(`DELETE FROM employees WHERE id IN (?, ?)`, t1, t2);
    await conn.run(`INSERT INTO employees (id, month_id, code, name, created_at) VALUES (?, ?, '__rm_uq__', '__rm_uq__', '2000-01-01')`, t1, tm);
    try {
      await conn.run(`INSERT INTO employees (id, month_id, code, name, created_at) VALUES (?, ?, '__rm_uq__', '__rm_uq__', '2000-01-01')`, t2, tm);
      // Thành công → không có constraint, dọn test rows
      await conn.run(`DELETE FROM employees WHERE id IN (?, ?)`, t1, t2);
    } catch {
      // Có constraint → rebuild bảng không có UNIQUE
      await conn.run(`DELETE FROM employees WHERE id = ?`, t1);
      const eCols = await conn.all<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name='employees' ORDER BY ordinal_position`
      );
      const colNames = eCols.map(c => c.column_name).join(', ');
      await conn.run(`ALTER TABLE employees RENAME TO employees_bak`);
      await conn.run(`
        CREATE TABLE employees (
          id                             VARCHAR PRIMARY KEY,
          month_id                       VARCHAR NOT NULL DEFAULT '${DEFAULT_MONTH_ID}',
          code                           VARCHAR NOT NULL,
          name                           VARCHAR NOT NULL,
          department_id                  VARCHAR DEFAULT '',
          ma_pb                          VARCHAR DEFAULT '',
          special_group                  VARCHAR DEFAULT '',
          group_code_end_date            VARCHAR DEFAULT '',
          ngay_nghi_cuoi_thang_truoc     VARCHAR DEFAULT '',
          so_ngay_lam_cuoi_thang_truoc   INTEGER DEFAULT 0,
          workdays                       VARCHAR DEFAULT '',
          overtime_hours                 VARCHAR DEFAULT '',
          late_minutes                   VARCHAR DEFAULT '',
          phep_nam                       VARCHAR DEFAULT '',
          active                         BOOLEAN DEFAULT TRUE,
          created_at                     VARCHAR NOT NULL,
          ${Array.from({ length: 31 }, (_, i) => `day_${i + 1} VARCHAR DEFAULT ''`).join(',\n          ')}
        )
      `);
      await conn.run(`INSERT INTO employees SELECT ${colNames} FROM employees_bak`);
      await conn.run(`DROP TABLE employees_bak`);
    }
  } catch { /* ignore */ }

  /* distribution_results — Kết quả Bảng Chấm Công (per-NV per-day) */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS distribution_results (
      id           VARCHAR PRIMARY KEY,
      month_id     VARCHAR NOT NULL,
      employee_id  VARCHAR NOT NULL,
      day          INTEGER NOT NULL,        -- 1..31
      day_type     INTEGER NOT NULL,        -- 0=làm, 1=nghỉ, 2=PN, 3=Ô, 4=TS, 5=DS, 6=O, 7=NL, 8=OF, 9=P
      check_in     VARCHAR DEFAULT '',      -- 'HH:MM'
      check_out    VARCHAR DEFAULT '',      -- 'HH:MM'
      shift_code   VARCHAR DEFAULT '',      -- 'Ca 1' | 'Ca 2' | ''
      ot_hours     DOUBLE  DEFAULT 0,       -- giờ tăng ca ngày này
      late_mins    DOUBLE  DEFAULT 0,       -- phút đi trễ ngày này
      created_at   VARCHAR NOT NULL
    )
  `);
  await conn.run(`CREATE INDEX IF NOT EXISTS idx_distribution_month_emp ON distribution_results(month_id, employee_id)`);
  await conn.run(`CREATE INDEX IF NOT EXISTS idx_distribution_month_emp_day ON distribution_results(month_id, employee_id, day)`);

  /* distribution_status — Tiến trình từng bước phân bổ theo tháng */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS distribution_status (
      month_id    VARCHAR PRIMARY KEY,
      step1_done  BOOLEAN DEFAULT FALSE,   -- Phân bổ ngày công
      step2_done  BOOLEAN DEFAULT FALSE,   -- Dữ liệu chấm công (xem)
      step3_done  BOOLEAN DEFAULT FALSE,   -- Xử lý thủ công
      step4_done  BOOLEAN DEFAULT FALSE,   -- Chia ca
      step5_done  BOOLEAN DEFAULT FALSE,   -- Phân phối OT & Trễ
      step6_done  BOOLEAN DEFAULT FALSE,   -- Tạo giờ vào/ra
      updated_at  VARCHAR DEFAULT ''
    )
  `);

  /* users – Tài khoản đăng nhập */
  await conn.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            VARCHAR PRIMARY KEY,
      username      VARCHAR NOT NULL UNIQUE,
      password_hash VARCHAR NOT NULL,
      role          VARCHAR DEFAULT 'admin',
      full_name     VARCHAR DEFAULT '',
      note          VARCHAR DEFAULT '',
      created_at    VARCHAR NOT NULL
    )
  `);
  // Migrate: thêm cột nếu DB cũ chưa có
  const uCols = await conn.all<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name='users'`);
  const uNames = uCols.map(c => c.column_name);
  if (!uNames.includes('full_name')) await conn.run(`ALTER TABLE users ADD COLUMN full_name VARCHAR DEFAULT ''`);
  if (!uNames.includes('note'))      await conn.run(`ALTER TABLE users ADD COLUMN note VARCHAR DEFAULT ''`);
  await seedAdminUser(conn);

  await seedIfEmpty(conn);
  await migrateAllocRules(conn); // thêm quy tắc mới vào các tháng hiện có
  await conn.close();
}

/* ─── Seed tài khoản admin mặc định ────────────────────── */
async function seedAdminUser(conn: Connection): Promise<void> {
  const rows = await conn.all<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM users`);
  if (rows[0].cnt > 0) return;
  const hash = await bcrypt.hash('admin123', 10);
  await conn.run(
    `INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', ?)`,
    'user_admin', 'admin', hash, new Date().toISOString().slice(0, 10)
  );
}

/* ─── Seed dữ liệu mẫu nếu DB trống ────────────────────── */
async function seedIfEmpty(conn: Connection): Promise<void> {
  const rows = await conn.all<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM months`);
  if (rows[0].cnt > 0) return;

  const now = new Date().toISOString().slice(0, 10);
  const MID = DEFAULT_MONTH_ID;

  /* ── months ─────────────────────────── */
  await conn.run(`
    INSERT INTO months (id, label, month, from_date, to_date, note, created_at) VALUES
      ('${MID}', 'Master Data', '', '', '', 'Tháng mặc định – dữ liệu ban đầu', '${now}')
  `);

  /* ── departments (35) ──────────────── */
  await conn.run(`
    INSERT INTO departments (id, month_id, code, name, parent_id, active, note, created_at) VALUES
      ('d_BB',    '${MID}', 'BB',   'BÁNH BẮP',          NULL, TRUE, '', '${now}'),
      ('d_BI',    '${MID}', 'BI',   'BÁNH IN',            NULL, TRUE, '', '${now}'),
      ('d_BBK',   '${MID}', 'BBK',  'BAO BÌ KẸO',         NULL, TRUE, '', '${now}'),
      ('d_BBL',   '${MID}', 'BBL',  'BAO BÌ LỚN',         NULL, TRUE, '', '${now}'),
      ('d_BBN',   '${MID}', 'BBN',  'BAO BÌ NHỎ',         NULL, TRUE, '', '${now}'),
      ('d_BV',    '${MID}', 'BV',   'BẢO VỆ',             NULL, TRUE, '', '${now}'),
      ('d_CN',    '${MID}', 'CN',   'CHI NHÁNH',          NULL, TRUE, '', '${now}'),
      ('d_CD',    '${MID}', 'CĐ',   'CƠ ĐIỆN',            NULL, TRUE, '', '${now}'),
      ('d_CK',    '${MID}', 'CK',   'CƠ KHÍ',             NULL, TRUE, '', '${now}'),
      ('d_CNTT',  '${MID}', 'CNTT', 'CÔNG NGHỆ THÔNG TIN',NULL, TRUE, '', '${now}'),
      ('d_CH',    '${MID}', 'CH',   'CỬA HÀNG',           NULL, TRUE, '', '${now}'),
      ('d_HN',    '${MID}', 'HN',   'HẠNH NHÂN',          NULL, TRUE, '', '${now}'),
      ('d_KT',    '${MID}', 'KT',   'KẾ TOÁN',            NULL, TRUE, '', '${now}'),
      ('d_K',     '${MID}', 'K',    'KHÂU KẸO',           NULL, TRUE, '', '${now}'),
      ('d_KNL',   '${MID}', 'KNL',  'KHO NGUYÊN LIỆU',    NULL, TRUE, '', '${now}'),
      ('d_KTP',   '${MID}', 'KTP',  'KHO THÀNH PHẨM',     NULL, TRUE, '', '${now}'),
      ('d_KD',    '${MID}', 'KD',   'KINH DOANH',          NULL, TRUE, '', '${now}'),
      ('d_KTH',   '${MID}', 'KTH',  'KỸ THUẬT',           NULL, TRUE, '', '${now}'),
      ('d_LX',    '${MID}', 'LX',   'LẠP XƯỞNG',          NULL, TRUE, '', '${now}'),
      ('d_LCH',   '${MID}', 'LCH',  'LÒ CHAY',            NULL, TRUE, '', '${now}'),
      ('d_LN',    '${MID}', 'LN',   'LÒ MẶN',             NULL, TRUE, '', '${now}'),
      ('d_LC',    '${MID}', 'LC',   'LONG CHÂU',          NULL, TRUE, '', '${now}'),
      ('d_NB',    '${MID}', 'NB',   'NHÀ BẾP',            NULL, TRUE, '', '${now}'),
      ('d_NH',    '${MID}', 'NH',   'NHÀ HÀNG',           NULL, TRUE, '', '${now}'),
      ('d_NS',    '${MID}', 'NS',   'NHÂN SỰ',            NULL, TRUE, '', '${now}'),
      ('d_PC',    '${MID}', 'PC',   'PÍA CHAY',           NULL, TRUE, '', '${now}'),
      ('d_PM',    '${MID}', 'PM',   'PÍA MẶN',            NULL, TRUE, '', '${now}'),
      ('d_QD1',   '${MID}', 'QĐ1',  'QUẬY ĐẬU 1',        NULL, TRUE, '', '${now}'),
      ('d_QD2',   '${MID}', 'QĐ2',  'QUẬY ĐẬU 2',        NULL, TRUE, '', '${now}'),
      ('d_SR',    '${MID}', 'SR',   'SẦU RIÊNG',          NULL, TRUE, '', '${now}'),
      ('d_TX',    '${MID}', 'TX',   'TÀI XẾ',             NULL, TRUE, '', '${now}'),
      ('d_TH',    '${MID}', 'TH',   'TỔNG HỢP',           NULL, TRUE, '', '${now}'),
      ('d_TV',    '${MID}', 'TV',   'TRỨNG VỊT',          NULL, TRUE, '', '${now}'),
      ('d_VS',    '${MID}', 'VS',   'VỆ SINH',            NULL, TRUE, '', '${now}'),
      ('d_BGD',   '${MID}', 'BGĐ',  'BAN GIÁM ĐỐC',       NULL, TRUE, '', '${now}')
  `);

  /* ── shifts (37) ────────────────────── */
  await conn.run(`
    INSERT INTO shifts
      (id, month_id, name, department_id, is_default, shift_type,
       window_start, clock_in, clock_out, window_end,
       late_minutes, ot_threshold, ot_calc, note, created_at)
    VALUES
      /* BB - BÁNH BẮP */
      ('s_BB1',   '${MID}', 'Ca 16h30',         'd_BB',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* BBK - BAO BÌ KẸO */
      ('s_BBK1',  '${MID}', 'Ca 16h30',         'd_BBK', FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* BBL - BAO BÌ LỚN */
      ('s_BBL1',  '${MID}', 'Ca 16h30',         'd_BBL', FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* BBN - BAO BÌ NHỎ */
      ('s_BBN1',  '${MID}', 'Ca 16h30',         'd_BBN', FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* BI - BÁNH IN */
      ('s_BI1',   '${MID}', 'Ca 16h30',         'd_BI',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* BV - BẢO VỆ (Ca 1 + Ca 2) */
      ('s_BV1',   '${MID}', '2 CA BV',          'd_BV',  FALSE, 'Ca 1', '05:50','06:00','14:00','14:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      ('s_BV2',   '${MID}', '2 CA BV',          'd_BV',  FALSE, 'Ca 2', '09:50','10:00','18:00','18:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* CĐ - CƠ ĐIỆN */
      ('s_CD1',   '${MID}', 'Ca 17h',           'd_CD',  FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* CH - CỬA HÀNG (Ca 1 + Ca 2) */
      ('s_CH1',   '${MID}', '2 CA CH/NH',       'd_CH',  FALSE, 'Ca 1', '06:20','06:30','14:30','14:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      ('s_CH2',   '${MID}', '2 CA CH/NH',       'd_CH',  FALSE, 'Ca 2', '11:50','12:00','20:00','20:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* CK - CƠ KHÍ */
      ('s_CK1',   '${MID}', 'Ca 17h',           'd_CK',  FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* CN - CHI NHÁNH */
      ('s_CN1',   '${MID}', 'Ca 17h',           'd_CN',  FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* CNTT - CÔNG NGHỆ THÔNG TIN */
      ('s_CNTT1', '${MID}', 'Ca 17h',           'd_CNTT',FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* HN - HẠNH NHÂN */
      ('s_HN1',   '${MID}', 'Ca 16h30',         'd_HN',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* K - KHÂU KẸO */
      ('s_K1',    '${MID}', 'Ca 16h30',         'd_K',   FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* KD - KINH DOANH */
      ('s_KD1',   '${MID}', 'Ca 17h',           'd_KD',  FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* KNL - KHO NGUYÊN LIỆU */
      ('s_KNL1',  '${MID}', 'Ca 16h30',         'd_KNL', FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* KT - KẾ TOÁN */
      ('s_KT1',   '${MID}', 'Ca 17h',           'd_KT',  FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* KTH - KỸ THUẬT */
      ('s_KTH1',  '${MID}', 'Ca 16h30',         'd_KTH', FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* KTP - KHO THÀNH PHẨM */
      ('s_KTP1',  '${MID}', 'Ca 17h',           'd_KTP', FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* LC - LONG CHÂU */
      ('s_LC1',   '${MID}', 'Ca 16h30',         'd_LC',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* LCH - LÒ CHAY */
      ('s_LCH1',  '${MID}', 'Ca 16h30',         'd_LCH', FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* LN - LÒ MẶN */
      ('s_LN1',   '${MID}', 'Ca 16h30',         'd_LN',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* LX - LẠP XƯỞNG */
      ('s_LX1',   '${MID}', 'Ca 16h30',         'd_LX',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* NB - NHÀ BẾP */
      ('s_NB1',   '${MID}', 'CA 8/CA HC',       'd_NB',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* NH - NHÀ HÀNG (Ca 1 + Ca 2) */
      ('s_NH1',   '${MID}', '2 CA CH/NH',       'd_NH',  FALSE, 'Ca 1', '06:20','06:30','14:30','14:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      ('s_NH2',   '${MID}', '2 CA CH/NH',       'd_NH',  FALSE, 'Ca 2', '11:50','12:00','20:00','20:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* NS - NHÂN SỰ */
      ('s_NS1',   '${MID}', 'Ca 16h30',         'd_NS',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* PC - PÍA CHAY */
      ('s_PC1',   '${MID}', 'Ca 16h30',         'd_PC',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* PM - PÍA MẶN */
      ('s_PM1',   '${MID}', 'Ca 16h30',         'd_PM',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* QĐ1 - QUẬY ĐẬU 1 */
      ('s_QD1',   '${MID}', 'Ca 16h30',         'd_QD1', FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* QĐ2 - QUẬY ĐẬU 2 */
      ('s_QD2',   '${MID}', 'Ca 16h30',         'd_QD2', FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* SR - SẦU RIÊNG */
      ('s_SR1',   '${MID}', 'Ca 16h30',         'd_SR',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* TH - TỔNG HỢP */
      ('s_TH1',   '${MID}', 'Ca 17h',           'd_TH',  FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* TX - TÀI XẾ */
      ('s_TX1',   '${MID}', 'Ca 17h',           'd_TX',  FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* TV - TRỨNG VỊT */
      ('s_TV1',   '${MID}', 'Ca 16h30',         'd_TV',  FALSE, 'Ca 1', '07:15','07:30','16:30','16:35', 0, 0, 'Tính từ giờ ra (công)','', '${now}'),
      /* VS - VỆ SINH */
      ('s_VS1',   '${MID}', 'Ca 17h',           'd_VS',  FALSE, 'Ca 1', '07:15','07:30','17:00','17:05', 0, 0, 'Tính từ giờ ra (công)','', '${now}')
  `);

  /* ── leave_types (14) ───────────────── */
  await conn.run(`
    INSERT INTO leave_types (id, month_id, code, name, description, paid, note, created_at) VALUES
      ('lt_X',   '${MID}', 'X',   'Làm 1 ngày',       '', TRUE, 'Ngày làm việc đầy đủ.',                                   '${now}'),
      ('lt_X2',  '${MID}', 'X/2', 'Làm nửa ngày',     '', TRUE, 'Làm việc nửa ngày (sáng hoặc chiều).',                    '${now}'),
      ('lt_P',   '${MID}', 'P',   'Nghỉ có phép',     '', TRUE, 'Nghỉ được phê duyệt.',                                      '${now}'),
      ('lt_PN',  '${MID}', 'PN',  'Phép năm',         '', TRUE, 'Nghỉ phép năm theo chính sách.',                             '${now}'),
      ('lt_O',   '${MID}', 'Ô',   'Nghỉ ốm',          '', TRUE, 'Nghỉ ốm đau.',                                             '${now}'),
      ('lt_TS',  '${MID}', 'TS',  'Nghỉ thai sản',    '', TRUE, 'Nghỉ thai sản theo Luật.',                                  '${now}'),
      ('lt_DS',  '${MID}', 'DS',   'Dưỡng sức',       '', TRUE, 'Nghỉ dưỡng sức.',                                         '${now}'),
      ('lt_O2',  '${MID}', 'O',   'Nghỉ không phép',  '', TRUE, 'Vắng mặt không lý do.',                                    '${now}'),
      ('lt_NL',  '${MID}', 'NL',  'Nghỉ lễ',          '', TRUE, 'Ngày lễ quốc gia.',                                        '${now}'),
      ('lt_LP',  '${MID}', 'LP',  'Nghỉ chủ nhật',    '', TRUE, 'Ngày nghỉ tua luân phiên hàng tuần.',                      '${now}'),
      ('lt_LL',  '${MID}', 'LL',  'Đi làm ngày lễ',   '', TRUE, 'Làm bù ngày lễ/tết.',                                      '${now}'),
      ('lt_H',   '${MID}', 'H',   'Ngày hưởng lương', '', TRUE, 'Ngày không đi làm nhưng hưởng lương.',                     '${now}'),
      ('lt_B',   '${MID}', 'B',   'Không đi làm',     '', TRUE, 'Ngày chưa vào công ty làm.',                               '${now}'),
      ('lt_OF',  '${MID}', 'OF',  'Thôi việc',        '', TRUE, 'Nhân viên đã nghỉ việc.',                                  '${now}')
  `);

  /* ── special_groups (3) ─────────────── */
  await conn.run(`
    INSERT INTO special_groups (id, month_id, code, name, work_hours, note, created_at) VALUES
      ('sg_18',   '${MID}', '18_DUOI_18',      'Nhóm dưới 18 tuổi',    7, 'Thời gian làm việc 7 giờ/ngày', '${now}'),
      ('sg_19A',  '${MID}', '19A_CO_THAI',     'Nhóm có thai',         7, 'Thời gian làm việc 7 giờ/ngày', '${now}'),
      ('sg_19B',  '${MID}', '19_NUOI_CON_NHO', 'Nhóm nuôi con nhỏ',    7, 'Thời gian làm việc 7 giờ/ngày', '${now}')
  `);

  /* ── alloc_rules (11) ───────────────── */
  await conn.run(`
    INSERT INTO alloc_rules (id, month_id, group_code, group_name, name, param_key, param_value, default_param, specific_value, description, active, created_at) VALUES
      ('ar_1',  '${MID}', 'WORK_RULE',            'Quy tắc làm việc',   'Giới hạn ngày làm liên tục',         'max_consecutive_days',          6,    '6 ngày',              '', 'Sau tối đa 6 Giới hạn ngày làm liên tục phải có ít nhất 1 ngày nghỉ.',                                                            TRUE, '${now}'),
      ('ar_2',  '${MID}', 'WORK_RULE',            'Quy tắc làm việc',   'Khoảng cách ngày nghỉ liên tháng',   'max_consecutive_days',          6,    '≤ 6 ngày',            '', 'Khoảng cách giữa ngày nghỉ cuối tháng trước và ngày nghỉ đầu tháng hiện tại không vượt quá 6 ngày làm.',                    TRUE, '${now}'),
      ('ar_3',  '${MID}', 'WORK_RULE',            'Quy tắc làm việc',   'Phân bổ ngày nghỉ đồng đều',         'max_day_off_difference',        1,    '±1 ngày',             '', 'Số ngày nghỉ của các nhân viên trong cùng phòng ban được phân bổ đều. Chênh lệch tối đa: ±1 ngày.',                        TRUE, '${now}'),
      ('ar_3b', '${MID}', 'WORK_RULE',            'Quy tắc làm việc',   'Phòng ban bỏ qua cân bằng nghỉ',     'skip_equal_rest_dept_codes',    NULL, 'BGD',                 'BGD', 'Danh sách mã phòng ban KHÔNG áp dụng cân bằng ngày nghỉ, cách nhau bởi dấu phẩy. VD: BGD,KD',                             TRUE, '${now}'),
      ('ar_4',  '${MID}', 'WORK_RULE',            'Quy tắc làm việc',   'Vị trí phép năm (PN)',               'pn_start_from_day',             15,   'Từ ngày 15',          '', 'PN được xếp vào ngày CUỐI của chuỗi LP liên tiếp DÀI NHẤT tính từ ngày 15 trở đi.',                                      TRUE, '${now}'),
      ('ar_5',  '${MID}', 'SHIFT_BALANCING_RULE', 'Quy tắc phân bổ ca', 'Phân bổ ca cân bằng',                'max_day_off_difference',        1,    'Chênh lệch ≤ 1 NV',  '', 'Số lượng nhân viên giữa các ca trong cùng phòng ban phải gần bằng nhau mỗi ngày.',                                        TRUE, '${now}'),
      ('ar_6',  '${MID}', 'ATTENDANCE_RULE',      'Quy tắc chấm công',  'Đi trễ tối đa/ngày',                'max_late_per_day_minutes',      9,    '9 phút/ngày',         '', 'Không có ngày nào có số phút trễ > 9 phút.',                                                                              TRUE, '${now}'),
      ('ar_7',  '${MID}', 'OT_RULE',              'Quy tắc tăng ca',    'Tăng ca tối thiểu/ngày',            'min_ot_per_day_minutes',        60,   '60 phút/ngày',        '', 'Nếu có tăng ca, số phút OT trong ngày phải ≥ 60 phút. Đặt 0 để tắt.',                                                    TRUE, '${now}'),
      ('ar_8',  '${MID}', 'OT_RULE',              'Quy tắc tăng ca',    'OT cân bằng trong phòng ban',       'max_ot_balance_diff_minutes',   30,   'Chênh lệch ≤ 30 phút','', 'Nhân viên cùng phòng ban có số giờ OT trong cùng ngày gần bằng nhau. Chênh lệch tối đa (phút).',                          TRUE, '${now}'),
      ('ar_9',  '${MID}', 'OT_RULE',              'Quy tắc tăng ca',    'Tăng ca tối đa giữa hai ngày nghỉ', 'max_ot_between_rest_hours',     12,   '12 giờ',              '', 'Tổng OT trong khoảng giữa hai ngày nghỉ liên tiếp không vượt N tiếng.',                                                   TRUE, '${now}'),
      ('ar_10', '${MID}', 'WORK_RULE',            'Quy tắc làm việc',   'Vị trí phép năm ưu tiên',           'pn_preferred_position',         NULL, 'Cuối kỳ nghỉ',        '', 'PN được xếp vào ngày CUỐI của chuỗi LP liên tiếp DÀI NHẤT tính từ ngày 15 trở đi.',                                      TRUE, '${now}')
  `);
}

/**
 * Migration tự động: thêm quy tắc "Vị trí phép năm ưu tiên" (pn_preferred_position) vào
 * mọi tháng hiện có nếu chưa tồn tại. Chạy mỗi lần app khởi động — idempotent.
 */
async function migrateAllocRules(conn: Connection): Promise<void> {
  try {
    const now = new Date().toISOString().slice(0, 10);
    const months = await conn.all<{ id: string }>(`SELECT id FROM months`);
    for (const { id: mid } of months) {
      // Kiểm tra xem đã có rule param_key='pn_preferred_position' cho tháng này chưa
      const exists = await conn.all<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM alloc_rules WHERE param_key = 'pn_preferred_position' AND month_id = ?`, mid
      );
      if (Number(exists[0]?.cnt) === 0) {
        const newId = `wk4_${mid}`;
        await conn.run(
          `INSERT INTO alloc_rules
             (id, month_id, group_code, group_name, name, param_key, param_value,
              default_param, specific_value, description, active, created_at)
           VALUES (?, ?, 'WORK_RULE', 'Quy tắc làm việc', 'Vị trí phép năm ưu tiên',
                   'pn_preferred_position', NULL, 'Cuối kỳ nghỉ',
                   'PN được xếp vào ngày CUỐI của chuỗi LP (nghỉ lịch) liên tiếp DÀI NHẤT tính từ ngày pn_start_from_day trở đi. Nếu nhiều chuỗi bằng nhau thì ưu tiên chuỗi cuối tháng. Nếu không có chuỗi LP nào từ ngày đó, lấy LP cuối cùng trong toàn tháng.',
                   '', TRUE, ?)`,
          newId, mid, now
        );
      }
    }
  } catch { /* bỏ qua lỗi migration — không ảnh hưởng khởi động */ }
}

