import { NextResponse } from "next/server";
import { getConn } from "@/lib/db";
export const runtime = "nodejs";
export async function POST() {
  const conn = await getConn();
  const log: string[] = [];
  try {
    const cols = await conn.all<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name='employees'`);
    const names = cols.map(c => c.column_name);
    if (names.includes('nghi_cuoi_thang_truoc') && !names.includes('ngay_nghi_cuoi_thang_truoc')) {
      await conn.run(`ALTER TABLE employees RENAME COLUMN nghi_cuoi_thang_truoc TO ngay_nghi_cuoi_thang_truoc`);
      log.push('RENAMED nghi_cuoi_thang_truoc');
    } else log.push('skip rename');
    if (!names.includes('so_ngay_lam_cuoi_thang_truoc')) {
      await conn.run(`ALTER TABLE employees ADD COLUMN so_ngay_lam_cuoi_thang_truoc INTEGER DEFAULT 0`);
      log.push('ADDED so_ngay_lam_cuoi_thang_truoc');
    } else log.push('so_ngay already exists');
    if (!names.includes('ngay_nghi_cuoi_thang_truoc')) {
      await conn.run(`ALTER TABLE employees ADD COLUMN ngay_nghi_cuoi_thang_truoc VARCHAR DEFAULT ''`);
      log.push('ADDED ngay_nghi_cuoi_thang_truoc');
    }
    // Create distribution_results if needed
    await conn.run(`CREATE TABLE IF NOT EXISTS distribution_results (id VARCHAR PRIMARY KEY, month_id VARCHAR NOT NULL, employee_id VARCHAR NOT NULL, day INTEGER NOT NULL, day_type INTEGER NOT NULL, check_in VARCHAR DEFAULT'', check_out VARCHAR DEFAULT'', shift_code VARCHAR DEFAULT'', ot_hours DOUBLE DEFAULT 0, late_mins DOUBLE DEFAULT 0, created_at VARCHAR NOT NULL)`);
    log.push('distribution_results OK');
    // Create distribution_status
    await conn.run(`CREATE TABLE IF NOT EXISTS distribution_status (month_id VARCHAR PRIMARY KEY, step1_done BOOLEAN DEFAULT FALSE, step2_done BOOLEAN DEFAULT FALSE, step3_done BOOLEAN DEFAULT FALSE, step4_done BOOLEAN DEFAULT FALSE, step5_done BOOLEAN DEFAULT FALSE, step6_done BOOLEAN DEFAULT FALSE, updated_at VARCHAR DEFAULT '')`);
    log.push('distribution_status OK');
    await conn.close();
    return NextResponse.json({ ok: true, log });
  } catch(e) { await conn.close(); return NextResponse.json({ error: String(e), log }, { status: 500 }); }
}
