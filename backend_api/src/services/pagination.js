import { HttpError } from '../utils/httpError.js';

export const defaultPageSize = 10;
export const maximumPageSize = 50;

export function wantsPagination(query = {}) {
  return query.paginated === 'true'
    || query.page != null
    || query.pageSize != null;
}

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

export function pageOptions(
  query = {},
  {
    fallbackPageSize = defaultPageSize,
    maxPageSize = maximumPageSize,
  } = {},
) {
  return {
    page: positiveInteger(query.page, 1),
    pageSize: positiveInteger(query.pageSize, fallbackPageSize, maxPageSize),
  };
}

export function pagePayload(items, total, { page, pageSize }, extra = {}) {
  const normalizedTotal = Number(total || 0);
  return {
    ...extra,
    items,
    page,
    pageSize,
    total: normalizedTotal,
    totalPages: Math.max(1, Math.ceil(normalizedTotal / pageSize)),
    hasNext: page * pageSize < normalizedTotal,
  };
}

export async function executePage(builder, options) {
  const offset = (options.page - 1) * options.pageSize;
  const { data, error, count } = await builder.range(
    offset,
    offset + options.pageSize - 1,
  );
  if (error) throw new HttpError(400, error.message);
  return pagePayload(data || [], count || 0, options);
}
