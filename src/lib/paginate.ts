/**
 * paginate.ts — Server-side pagination helpers dùng chung cho tất cả step APIs
 */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResponse<T> extends PageMeta {
  data: T[];
}

export function parsePage(url: URL, defaultLimit = 50) {
  const page  = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
  const limit = Math.min(999999, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(defaultLimit))));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildPagedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PagedResponse<T> {
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
