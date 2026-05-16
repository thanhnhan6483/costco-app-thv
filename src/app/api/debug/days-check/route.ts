import { NextRequest, NextResponse } from 'next/server';
import { getConn } from '@/lib/db';
import { loadMonthInfo } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get('month') ?? '';
  const conn = await getConn();
  const { month, year, daysInMonth } = await loadMonthInfo(monthId);
  const fromDateRow = await conn.all<{ fromDate: string }>(`SELECT from_date AS fromDate FROM months WHERE id = ?`, monthId);
  const dayCounts = await conn.all<{ day: number; cnt: number }>(
    `SELECT day, COUNT(*) AS cnt FROM distribution_results WHERE month_id = ? GROUP BY day ORDER BY day`, monthId
  );
  await conn.close();
  return NextResponse.json({
    monthId, fromDate: fromDateRow[0]?.fromDate, month, year, daysInMonth,
    totalDays: dayCounts.length,
    maxDay: dayCounts.length ? Math.max(...dayCounts.map(r => r.day)) : 0,
    lastDays: dayCounts.slice(-5),
  });
}
