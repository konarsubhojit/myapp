// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

// Rate Limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100
} as const;

// Request Body Limits
export const BODY_LIMITS = {
  JSON: '10mb',
  URLENCODED: '10mb'
} as const;

// Server Configuration
export const SERVER_CONFIG = {
  DEFAULT_PORT: 5000,
  TRUST_PROXY_LEVEL: 1
} as const;
