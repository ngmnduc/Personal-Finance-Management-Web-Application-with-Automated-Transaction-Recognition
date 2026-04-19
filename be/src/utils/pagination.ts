// ─── Pagination Utilities ─────────────────────────────────────────────────────

const MAX_LIMIT = 100;

export interface PaginationParams {
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Convert page/limit into Prisma skip + take.
 * Enforces: page >= 1, limit in [1, 100].
 */
export function getPaginationParams(page: number, limit: number): PaginationParams {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Build pagination metadata for API responses.
 */
export function getPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}
