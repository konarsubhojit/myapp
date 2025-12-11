// Pagination Configuration
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  ALLOWED_LIMITS: [10, 20, 50] as const,
  MAX_LIMIT: 50
} as const;

export type AllowedLimit = typeof PAGINATION.ALLOWED_LIMITS[number];

export function isAllowedLimit(limit: number): limit is AllowedLimit {
  return (PAGINATION.ALLOWED_LIMITS as readonly number[]).includes(limit);
}
