export type Pagination = { page: number; limit: number; skip: number };

export const parsePagination = (
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number } = {},
): Pagination => {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 20;
  const requestedPage = Number.parseInt(String(query.page ?? defaultPage), 10);
  const requestedLimit = Number.parseInt(String(query.limit ?? defaultLimit), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : defaultPage;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
};

export const paginationMeta = (pagination: Pagination, total: number) => ({
  page: pagination.page,
  limit: pagination.limit,
  total,
  totalPages: Math.ceil(total / pagination.limit),
});
