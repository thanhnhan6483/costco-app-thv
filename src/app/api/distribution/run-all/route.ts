/**
 * POST /api/distribution/run-all
 * Chạy tuần tự Step 1 → 2 → 4 → 5 → 6 (bỏ qua step 3 edit thủ công)
 * Sau đó vẫn có thể xem dữ liệu từng bước qua GET /api/distribution/step/{n}
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function callStep(stepNum: number, monthId: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}/api/distribution/step/${stepNum}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthId }),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  const { monthId } = await req.json();
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const baseUrl = new URL(req.url).origin;
  const results: Record<string, unknown> = {};
  const t0 = Date.now();

  try {
    // Chạy tuần tự: step/2 (phân bổ) → step/3 (chia ca) → step/4 (OT/late) → step/5 (giờ vào/ra)
    results.step1 = { ok: true, step: 1, note: 'skipped (view-only)' };
    results.step2 = await callStep(2, monthId, baseUrl);
    results.step3 = await callStep(3, monthId, baseUrl);
    results.step4 = await callStep(4, monthId, baseUrl);
    results.step5 = await callStep(5, monthId, baseUrl);

    return NextResponse.json({
      ok: true, monthId,
      elapsedMs: Date.now() - t0,
      steps: results,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), results }, { status: 500 });
  }
}
