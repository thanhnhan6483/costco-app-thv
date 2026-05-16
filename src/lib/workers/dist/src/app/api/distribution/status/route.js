"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const stepHelpers_1 = require("@/lib/stepHelpers");
exports.runtime = 'nodejs';
async function GET(req) {
    const monthId = new URL(req.url).searchParams.get('month') ?? '';
    if (!monthId)
        return server_1.NextResponse.json({ error: 'Thiếu month' }, { status: 400 });
    const status = await (0, stepHelpers_1.getStatus)(monthId);
    return server_1.NextResponse.json(status);
}
