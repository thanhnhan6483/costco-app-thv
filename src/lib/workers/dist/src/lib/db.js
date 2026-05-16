"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MONTH_ID = void 0;
exports.getConn = getConn;
/**
 * src/lib/db.ts
 * Singleton DuckDB connection cho toàn bộ ứng dụng COSTCO.
 * Dữ liệu được lưu cục bộ tại: <project-root>/data/costco.duckdb
 *
 * v2: Mỗi bảng cấu hình có cột month_id → cấu hình độc lập theo từng Tháng Phân Bổ.
 *     Dữ liệu cũ (không có month_id) sẽ được gắn vào tháng 'month_jan2026' (01/2026).
 */
const path_1 = __importDefault(require("path"));
const duckdb_async_1 = require("duckdb-async");
const constants_1 = require("./constants");
// Re-export for API routes that import from db.ts
var constants_2 = require("./constants");
Object.defineProperty(exports, "DEFAULT_MONTH_ID", { enumerable: true, get: function () { return constants_2.DEFAULT_MONTH_ID; } });
const DB_PATH = path_1.default.join(process.cwd(), 'data', 'costco.duckdb');
async function getDb() {
    if (!globalThis.__duckdb) {
        globalThis.__duckdb = await duckdb_async_1.Database.create(DB_PATH);
        await initSchema(globalThis.__duckdb);
    }
    return globalThis.__duckdb;
}
async function getConn() {
    const db = await getDb();
    return db.connect();
}
/* ─── Schema & seed ──────────────────────────────────────── */
async function initSchema(db) {
    const conn = await db.connect();
    /* months – Tháng phân bổ (bảng gốc, không có month_id) */
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
        const mCols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='months'`);
        const mNames = mCols.map(c => c.column_name);
        if (!mNames.includes('label')) {
            await conn.run(`ALTER TABLE months ADD COLUMN label VARCHAR DEFAULT ''`);
        }
        if (!mNames.includes('locked')) {
            await conn.run(`ALTER TABLE months ADD COLUMN locked BOOLEAN DEFAULT FALSE`);
        }
    }
    catch { /* bảng chưa tồn tại */ }
    /* Đảm bảo tháng 01/2026 tồn tại (tháng mặc định cho dữ liệu cũ) */
    try {
        const existing = await conn.all(`SELECT COUNT(*) AS cnt FROM months WHERE id = '${constants_1.DEFAULT_MONTH_ID}'`);
        if (Number(existing[0].cnt) === 0) {
            await conn.run(`INSERT INTO months (id, label, month, from_date, to_date, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, constants_1.DEFAULT_MONTH_ID, 'Tháng 01/2026', '01/2026', '01/01/2026', '31/01/2026', 'Tháng mặc định – dữ liệu ban đầu', '2026-01-01');
        }
    }
    catch { /* bảng chưa tồn tại, sẽ được seed ở dưới */ }
    /* departments – Phòng ban */
    await conn.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id        VARCHAR PRIMARY KEY,
      month_id  VARCHAR NOT NULL DEFAULT '${constants_1.DEFAULT_MONTH_ID}',
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
        const deptCols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='departments'`);
        const names = deptCols.map(c => c.column_name);
        if (!names.includes('month_id')) {
            await conn.run(`ALTER TABLE departments ADD COLUMN month_id VARCHAR DEFAULT '${constants_1.DEFAULT_MONTH_ID}'`);
            // Gắn dữ liệu cũ vào tháng mặc định
            await conn.run(`UPDATE departments SET month_id = '${constants_1.DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
        }
        if (!names.includes('parent_id')) {
            await conn.run(`ALTER TABLE departments ADD COLUMN parent_id VARCHAR DEFAULT NULL`);
        }
    }
    catch { /* bảng chưa tồn tại */ }
    /* Xóa UNIQUE constraint cũ trên code (nếu có) bằng cách rebuild bảng.
       DuckDB không hỗ trợ DROP CONSTRAINT, nên dùng RENAME + CREATE + INSERT + DROP */
    try {
        // Thử INSERT trùng code vào tháng khác – nếu lỗi UNIQUE thì cần rebuild
        const testId = '__constraint_test__';
        const testMonth = '__test_month__';
        await conn.run(`INSERT INTO departments (id, month_id, code, name, created_at) VALUES (?, ?, 'KD', '__test__', '2000-01-01')`, testId, testMonth);
        // Thành công → constraint đã đúng, xóa row test
        await conn.run(`DELETE FROM departments WHERE id = ?`, testId);
    }
    catch {
        // Lỗi UNIQUE → rebuild bảng với composite key (month_id, code)
        try {
            await conn.run(`ALTER TABLE departments RENAME TO departments_old`);
            await conn.run(`
        CREATE TABLE departments (
          id         VARCHAR PRIMARY KEY,
          month_id   VARCHAR NOT NULL DEFAULT '${constants_1.DEFAULT_MONTH_ID}',
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
        }
        catch { /* ignore rebuild error */ }
    }
    /* shifts – Ca làm việc */
    await conn.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id              VARCHAR PRIMARY KEY,
      month_id        VARCHAR NOT NULL DEFAULT '${constants_1.DEFAULT_MONTH_ID}',
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
        const shiftCols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='shifts'`);
        const names = shiftCols.map(c => c.column_name);
        const newCols = [
            ['month_id', `VARCHAR DEFAULT '${constants_1.DEFAULT_MONTH_ID}'`],
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
        await conn.run(`UPDATE shifts SET month_id = '${constants_1.DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
    }
    catch { /* bảng chưa tồn tại */ }
    /* leave_types – Loại nghỉ phép */
    await conn.run(`
    CREATE TABLE IF NOT EXISTS leave_types (
      id          VARCHAR PRIMARY KEY,
      month_id    VARCHAR NOT NULL DEFAULT '${constants_1.DEFAULT_MONTH_ID}',
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
        const ltCols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='leave_types'`);
        const names = ltCols.map(c => c.column_name);
        if (!names.includes('month_id')) {
            await conn.run(`ALTER TABLE leave_types ADD COLUMN month_id VARCHAR DEFAULT '${constants_1.DEFAULT_MONTH_ID}'`);
            await conn.run(`UPDATE leave_types SET month_id = '${constants_1.DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
        }
        if (!names.includes('description')) {
            await conn.run(`ALTER TABLE leave_types ADD COLUMN description VARCHAR DEFAULT ''`);
        }
        if (!names.includes('day_type')) {
            await conn.run(`ALTER TABLE leave_types ADD COLUMN day_type INTEGER DEFAULT -1`);
            // Seed giá trị mặc định theo code
            const seedMap = {
                X: 0, L: 1, LP: 1, PN: 2, 'Ô': 3, TS: 4, DS: 5, O: 6, NL: 7, OF: 8, P: 9,
                'X/2': 10, LL: 11, LN: 12, H: 13, B: 14,
            };
            for (const [code, dt] of Object.entries(seedMap)) {
                await conn.run(`UPDATE leave_types SET day_type = ? WHERE code = ?`, dt, code);
            }
        }
    }
    catch { /* bảng chưa tồn tại */ }
    /* special_groups – Nhóm đặc thù */
    await conn.run(`
    CREATE TABLE IF NOT EXISTS special_groups (
      id        VARCHAR PRIMARY KEY,
      month_id  VARCHAR NOT NULL DEFAULT '${constants_1.DEFAULT_MONTH_ID}',
      code      VARCHAR NOT NULL,
      name      VARCHAR NOT NULL,
      work_hours DOUBLE DEFAULT 8.0,
      note      VARCHAR DEFAULT '',
      created_at VARCHAR NOT NULL
    )
  `);
    /* Migrate special_groups */
    try {
        const sgCols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='special_groups'`);
        const names = sgCols.map(c => c.column_name);
        if (!names.includes('month_id')) {
            await conn.run(`ALTER TABLE special_groups ADD COLUMN month_id VARCHAR DEFAULT '${constants_1.DEFAULT_MONTH_ID}'`);
            await conn.run(`UPDATE special_groups SET month_id = '${constants_1.DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
        }
        if (!names.includes('work_hours')) {
            await conn.run(`ALTER TABLE special_groups ADD COLUMN work_hours DOUBLE DEFAULT 8.0`);
        }
    }
    catch { /* bảng chưa tồn tại */ }
    /* alloc_rules – Quy tắc phân bổ */
    await conn.run(`
    CREATE TABLE IF NOT EXISTS alloc_rules (
      id             VARCHAR PRIMARY KEY,
      month_id       VARCHAR NOT NULL DEFAULT '${constants_1.DEFAULT_MONTH_ID}',
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
        const arCols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='alloc_rules'`);
        const names = arCols.map(c => c.column_name);
        if (!names.includes('month_id')) {
            await conn.run(`ALTER TABLE alloc_rules ADD COLUMN month_id VARCHAR DEFAULT '${constants_1.DEFAULT_MONTH_ID}'`);
            await conn.run(`UPDATE alloc_rules SET month_id = '${constants_1.DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
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
    }
    catch { /* bảng chưa tồn tại */ }
    /* employees – Nhân viên */
    await conn.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id                        VARCHAR PRIMARY KEY,
      month_id                  VARCHAR NOT NULL DEFAULT '${constants_1.DEFAULT_MONTH_ID}',
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
        const eCols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='employees'`);
        const names = eCols.map(c => c.column_name);
        const empNewCols = [
            ['month_id', `VARCHAR DEFAULT '${constants_1.DEFAULT_MONTH_ID}'`],
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
        }
        else if (names.includes('nghi_cuoi_thang_truoc') && names.includes('ngay_nghi_cuoi_thang_truoc')) {
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
        await conn.run(`UPDATE employees SET month_id = '${constants_1.DEFAULT_MONTH_ID}' WHERE month_id IS NULL OR month_id = ''`);
    }
    catch { /* bảng chưa tồn tại */ }
    /* distribution_results — Kết quả phân bổ tự động (per-NV per-day) */
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
    await seedIfEmpty(conn);
    await migrateAllocRules(conn); // thêm quy tắc mới vào các tháng hiện có
    await conn.close();
}
/* ─── Seed dữ liệu mẫu nếu DB trống ────────────────────── */
async function seedIfEmpty(conn) {
    const rows = await conn.all(`SELECT COUNT(*) AS cnt FROM months`);
    if (rows[0].cnt > 0)
        return; // Đã có dữ liệu, bỏ qua
    const now = new Date().toISOString().slice(0, 10);
    const MID = constants_1.DEFAULT_MONTH_ID;
    // Seed tháng 01/2026
    await conn.run(`
    INSERT INTO months (id, label, month, from_date, to_date, note, created_at) VALUES
      ('${MID}', 'Tháng 01/2026', '01/2026', '01/01/2026', '31/01/2026', 'Tháng mặc định – dữ liệu ban đầu', '2026-01-01')
  `);
    // Departments
    await conn.run(`
    INSERT INTO departments (id, month_id, code, name, parent_id, active, note, created_at) VALUES
      ('d1', '${MID}', 'KD',   'Kinh Doanh',   NULL, TRUE, '', '${now}'),
      ('d2', '${MID}', 'SX',   'Sản Xuất',     NULL, TRUE, '', '${now}'),
      ('d3', '${MID}', 'KT',   'Kế Toán',      NULL, TRUE, '', '${now}'),
      ('d4', '${MID}', 'HR',   'Nhân Sự',      NULL, TRUE, '', '${now}'),
      ('d5', '${MID}', 'BGD',  'Ban Giám Đốc', NULL, TRUE, '', '${now}'),
      ('d6', '${MID}', 'BV',   'Bảo Vệ',       NULL, TRUE, '', '${now}'),
      ('d7', '${MID}', 'TH',   'Tổng Hợp',     NULL, TRUE, '', '${now}'),
      ('d8', '${MID}', 'CNTT', 'Công Nghệ TT', NULL, TRUE, '', '${now}')
  `);
    // Shifts
    await conn.run(`
    INSERT INTO shifts
      (id, month_id, name, department_id, is_default, shift_type,
       window_start, clock_in, clock_out, window_end,
       late_minutes, ot_threshold, ot_calc, note, created_at)
    VALUES
      ('s01', '${MID}', 'Ca làm việc chung của công ty', NULL,  TRUE,  '',       '07:20','07:30','16:30','16:35', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s02', '${MID}', 'BỘ PHẬN TỔNG HỢP',             'd7',  FALSE, 'Ca 1',   '07:20','07:30','17:00','17:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s03', '${MID}', 'BỘ PHẬN KẾ TOÁN',              'd3',  FALSE, 'Ca 1',   '07:20','07:30','17:00','17:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s04', '${MID}', 'KHO THÀNH PHẨM',               'd2',  FALSE, 'Ca 1',   '07:20','07:30','17:00','17:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s05', '${MID}', 'CHI NHÁNH ST',                 'd1',  FALSE, 'Ca 1',   '07:20','07:30','17:00','17:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s06', '${MID}', 'CƠ ĐIỆN',                      'd2',  FALSE, 'Ca 1',   '07:20','07:30','17:00','17:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s07', '${MID}', 'CƠ KHÍ',                       'd2',  FALSE, 'Ca 1',   '07:20','07:30','17:00','17:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s08', '${MID}', 'VỆ SINH',                      'd2',  FALSE, 'Ca 1',   '07:20','07:30','17:00','17:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s09', '${MID}', 'BỘ PHẬN BẢO VỆ',              'd6',  FALSE, 'Ca 1',   '05:50','06:00','14:00','14:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s10', '${MID}', 'BỘ PHẬN BẢO VỆ (Ca 2)',       'd6',  FALSE, 'Ca 2',   '09:50','10:00','18:00','18:10', 0,  0, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s11', '${MID}', 'CỬA HÀNG',                     'd1',  FALSE, 'Ca 1',   '06:20','06:30','14:30','14:40', 0,  0, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s12', '${MID}', 'CỬA HÀNG (Ca 2)',              'd1',  FALSE, 'Ca 2',   '11:50','12:00','20:00','20:10', 0,  0, 'Tính từ giờ vào (trưa)','', '${now}'),
      ('s13', '${MID}', 'NHÀ HÀNG',                     'd1',  FALSE, 'Ca 1',   '06:20','06:30','14:30','14:40', 0,  0, 'Tính từ giờ vào (trưa)','', '${now}'),
      ('s14', '${MID}', 'NHÀ HÀNG (Ca 2)',              'd1',  FALSE, 'Ca 2',   '11:50','12:00','20:00','20:10', 0,  0, 'Tính từ giờ vào (trưa)','', '${now}'),
      ('s15', '${MID}', 'KINH DOANH',                   'd1',  FALSE, 'Ca 1',   '06:50','07:00','15:00','15:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s16', '${MID}', 'KINH DOANH (Ca 2)',            'd1',  FALSE, 'Ca 2',   '13:50','14:00','22:00','22:10', 0,  0, 'Tính từ giờ vào (trưa)','', '${now}'),
      ('s17', '${MID}', 'Ca làm việc 7h30-10h20',       NULL,  FALSE, '',       '07:20','07:30','10:20','10:30', 0,  0, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s18', '${MID}', 'Ca làm việc 7h30-17h00',       NULL,  FALSE, '',       '07:20','07:30','17:00','17:00', 0,  0, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s19', '${MID}', 'Ca 17h',                        NULL,  FALSE, '',       '07:20','07:30','17:00','17:05', 0,  0, 'Tính từ giờ ra (công)',  '', '${now}'),
      ('s20', '${MID}', 'Công nghệ TT',                 'd8',  FALSE, 'Ca 1',   '07:20','07:30','17:00','17:10', 0, 60, 'Tính từ giờ ra (công)',  '', '${now}')
  `);
    // Leave Types
    await conn.run(`
    INSERT INTO leave_types (id, month_id, code, name, description, paid, note, created_at) VALUES
      ('lt01', '${MID}', 'X',   'Làm 1 ngày',       'Ngày làm việc đầy đủ.',                         TRUE,  'Tính ngày công: Có',          '${now}'),
      ('lt02', '${MID}', 'X/2', 'Làm nửa ngày',     'Làm việc nửa ngày (sáng hoặc chiều).',          TRUE,  'Tính ngày công: 0.5 ngày',    '${now}'),
      ('lt03', '${MID}', 'P',   'Nghỉ có phép',     'Nghỉ được phê duyệt.',                           FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt04', '${MID}', 'PN',  'Phép năm',         'Nghỉ phép năm theo chính sách.',                 FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt05', '${MID}', 'Ô',   'Nghỉ ốm',          'Nghỉ ốm đau.',                                   FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt06', '${MID}', 'TS',  'Nghỉ thai sản',    'Nghỉ thai sản theo Luật.',                       FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt07', '${MID}', 'DS',  'Dưỡng sức',        'Nghỉ dưỡng sức.',                                FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt08', '${MID}', 'O',   'Nghỉ không phép',  'Vắng mặt không lý do.',                          FALSE, 'Tính ngày công: Không (vi phạm)', '${now}'),
      ('lt09', '${MID}', 'NL',  'Nghỉ lễ',          'Ngày lễ quốc gia.',                              FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt10', '${MID}', 'L',   'Ngày nghỉ',        'Ngày nghỉ thường lệ hàng tuần.',                 FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt11', '${MID}', 'LP',  'Nghỉ chủ nhật',    'Ngày Chủ Nhật hoặc nghỉ lịch.',                 FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt12', '${MID}', 'LL',  'Đi làm ngày lễ',   'Làm bù ngày lễ/tết.',                            TRUE,  'Tính ngày công: Có (phụ cấp lễ)', '${now}'),
      ('lt13', '${MID}', 'LN',  'Đi làm ngày nghỉ', 'Làm vào ngày nghỉ hàng tuần.',                  TRUE,  'Tính ngày công: Có (phụ cấp)', '${now}'),
      ('lt14', '${MID}', 'H',   'Ngày hưởng lương', 'Ngày không đi làm nhưng hưởng lương.',           FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt15', '${MID}', 'B',   'Không đi làm',     'Ngày không đi làm không lý do rõ.',              FALSE, 'Tính ngày công: Không',       '${now}'),
      ('lt16', '${MID}', 'OF',  'Thôi việc',        'Nhân viên đã nghỉ việc.',                        FALSE, 'Tính ngày công: Không',       '${now}')
  `);
    // Alloc Rules (bao gồm các quy tắc WORK_RULE chi tiết)
    await conn.run(`
    INSERT INTO alloc_rules (id, month_id, group_code, group_name, name, param_key, param_value, default_param, specific_value, description, active, created_at) VALUES
      ('1',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Số ngày làm việc tối thiểu',      '',                             NULL, '6 ngày',                                    '', 'Quy định số ngày làm tối thiểu/tháng',              TRUE, '${now}'),
      ('2',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Số ngày nghỉ phép tối đa',        '',                             NULL, '≤ 6 ngày',                                  '', 'Giới hạn nghỉ phép trong kỳ',                       TRUE, '${now}'),
      ('3',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Phân bổ ca theo phòng ban',        '',                             NULL, 'Áp dụng cho mọi phòng ban trừ BGD',         '', 'Ưu tiên phân bổ ca theo phòng ban mặc định',        TRUE, '${now}'),
      ('4',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Lịch nghỉ phép phải liên tiếp',   '',                             NULL, 'Cuối kỳ nghỉ',                              '', 'Ngày nghỉ phép phải đứng liền nhau',                TRUE, '${now}'),
      ('5',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Cân bằng nhân lực theo ca',       '',                             NULL, 'Chênh lệch ≤ 1 NV/ca/ngày',                 '', 'Số NV/ca không được chênh lệch quá mức quy định',   TRUE, '${now}'),
      ('6',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Thời gian đi trễ cho phép',       '',                             NULL, '9 phút/ngày',                               '', 'Số phút đi trễ tối đa được bỏ qua',                 TRUE, '${now}'),
      ('7',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Giờ tăng ca tối đa',              '',                             NULL, '60 phút/ngày',                              '', 'Số phút Tăng ca tối đa được tính mỗi ngày',              TRUE, '${now}'),
      ('8',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Sai lệch giờ ra cho phép',        '',                             NULL, 'Chênh lệch ≤ 30 phút/ngày',                 '', 'Giờ ra có thể lệch tối đa so với giờ chuẩn',        TRUE, '${now}'),
      ('9',   '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Khoảng cách ca tối thiểu',        '',                             NULL, '12 giờ',                                    '', 'Thời gian nghỉ tối thiểu giữa 2 ca',                TRUE, '${now}'),
      ('wk1', '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Giới hạn ngày làm liên tục',      'max_consecutive_days',         6,    '6 ngày',                                    'Sau tối đa 6 ngày làm liên tiếp phải có ít nhất 1 ngày nghỉ. Dùng để kiểm tra constraint backtracking.', '', TRUE, '${now}'),
      ('wk2', '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Ngưỡng ngày công chọn giải thuật','workdays_algorithm_threshold',  27,   '27 ngày',                                   'Nếu workdays < 27 → dùng generateOneArrangement; nếu ≥ 27 → random từ pool.', '', TRUE, '${now}'),
      ('wk3', '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Phép năm đặt từ ngày thứ',        'pn_start_from_day',            15,   'Từ ngày 15',                                'Phép năm (PN) chỉ được xếp vào các ngày từ ngày thứ 15 của tháng trở đi (index >= 14).', '', TRUE, '${now}'),
      ('wk4', '${MID}', 'WORK_RULE', 'Quy tắc làm việc', 'Vị trí phép năm ưu tiên',         'pn_preferred_position',        NULL, 'Cuối kỳ nghỉ',                              'PN được xếp vào ngày CUỐI của chuỗi LP (nghỉ lịch) liên tiếp DÀI NHẤT tính từ ngày pn_start_from_day trở đi. Nếu nhiều chuỗi bằng nhau thì ưu tiên chuỗi cuối tháng.', '', TRUE, '${now}')
  `);
}
/**
 * Migration tự động: thêm quy tắc "Vị trí phép năm ưu tiên" (pn_preferred_position) vào
 * mọi tháng hiện có nếu chưa tồn tại. Chạy mỗi lần app khởi động — idempotent.
 */
async function migrateAllocRules(conn) {
    try {
        const now = new Date().toISOString().slice(0, 10);
        const months = await conn.all(`SELECT id FROM months`);
        for (const { id: mid } of months) {
            // Kiểm tra xem đã có rule param_key='pn_preferred_position' cho tháng này chưa
            const exists = await conn.all(`SELECT COUNT(*) AS cnt FROM alloc_rules WHERE param_key = 'pn_preferred_position' AND month_id = ?`, mid);
            if (Number(exists[0]?.cnt) === 0) {
                const newId = `wk4_${mid}`;
                await conn.run(`INSERT INTO alloc_rules
             (id, month_id, group_code, group_name, name, param_key, param_value,
              default_param, specific_value, description, active, created_at)
           VALUES (?, ?, 'WORK_RULE', 'Quy tắc làm việc', 'Vị trí phép năm ưu tiên',
                   'pn_preferred_position', NULL, 'Cuối kỳ nghỉ',
                   'PN được xếp vào ngày CUỐI của chuỗi LP (nghỉ lịch) liên tiếp DÀI NHẤT tính từ ngày pn_start_from_day trở đi. Nếu nhiều chuỗi bằng nhau thì ưu tiên chuỗi cuối tháng. Nếu không có chuỗi LP nào từ ngày đó, lấy LP cuối cùng trong toàn tháng.',
                   '', TRUE, ?)`, newId, mid, now);
            }
        }
    }
    catch { /* bỏ qua lỗi migration — không ảnh hưởng khởi động */ }
}
