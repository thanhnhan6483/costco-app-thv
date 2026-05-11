import { NextResponse } from "next/server";
import { getConn } from "@/lib/db";
export const runtime = "nodejs";
export async function POST() {
  const conn = await getConn();
  try {
    await conn.run(`CREATE TABLE IF NOT EXISTS distribution_results (
      id VARCHAR PRIMARY KEY, month_id VARCHAR NOT NULL,
      employee_id VARCHAR NOT NULL, day INTEGER NOT NULL, day_type INTEGER NOT NULL,
      check_in VARCHAR DEFAULT '', check_out VARCHAR DEFAULT '',
      shift_code VARCHAR DEFAULT '', ot_hours DOUBLE DEFAULT 0,
      late_mins DOUBLE DEFAULT 0, created_at VARCHAR NOT NULL)`);
    await conn.close();
    return NextResponse.json({ ok: true });
  } catch(e) { await conn.close(); return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
