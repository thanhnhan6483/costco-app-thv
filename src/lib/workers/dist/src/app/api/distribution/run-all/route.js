"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
/**
 * POST /api/distribution/run-all
 * Chạy tuần tự Step 1 → 2 → 4 → 5 → 6 (bỏ qua step 3 edit thủ công)
 * Sau đó vẫn có thể xem dữ liệu từng bước qua GET /api/distribution/step/{n}
 */
const server_1 = require("next/server");
exports.runtime = 'nodejs';
async function callStep(stepNum, monthId, baseUrl) {
    const res = await fetch(`${baseUrl}/api/distribution/step/${stepNum}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId }),
    });
    return res.json();
}
async function POST(req) {
    const { monthId } = await req.json();
    if (!monthId)
        return server_1.NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
    const baseUrl = new URL(req.url).origin;
    const results = {};
    const t0 = Date.now();
    try {
        // Đúng thứ tự Python: data trước → arrangement sau (dùng data làm constraint)
        results.step2 = { ok: true, step: 2, note: 'skipped (view-only)' }; // Bước 1 UI: Xem data
        results.step3 = { ok: true, step: 3, note: 'skipped (manual edit)' }; // Bước 2 UI: Edit (user tự làm)
        results.step1 = await callStep(1, monthId, baseUrl); // Bước 3 UI: Arrangement (dùng data làm constraint)
        results.step4 = await callStep(4, monthId, baseUrl); // Bước 4 UI: Chia ca
        results.step5 = await callStep(5, monthId, baseUrl); // Bước 5 UI: OT & Trễ
        results.step6 = await callStep(6, monthId, baseUrl); // Bước 6 UI: Giờ IN/OUT
        return server_1.NextResponse.json({
            ok: true, monthId,
            elapsedMs: Date.now() - t0,
            steps: results,
        });
    }
    catch (e) {
        return server_1.NextResponse.json({ error: String(e), results }, { status: 500 });
    }
}
