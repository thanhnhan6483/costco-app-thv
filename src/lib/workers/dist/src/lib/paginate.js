"use strict";
/**
 * paginate.ts — Server-side pagination helpers dùng chung cho tất cả step APIs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePage = parsePage;
exports.buildPagedResponse = buildPagedResponse;
function parsePage(url, defaultLimit = 50) {
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(999999, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(defaultLimit))));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}
function buildPagedResponse(data, total, page, limit) {
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
