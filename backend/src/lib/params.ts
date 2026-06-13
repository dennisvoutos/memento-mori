/**
 * Helper to safely extract a route param as a string.
 * Express 5 types `req.params[key]` as `string | string[]` — we always use single segments.
 */
export function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0];
  return value ?? '';
}

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extract a route param as a string and validate it is a UUID v4.
 * Returns an empty string if the value is not a valid UUID, so Prisma
 * queries return null/404 rather than throwing a database error.
 */
export function paramUUID(value: string | string[] | undefined): string {
  const raw = param(value);
  if (!UUID_V4_REGEX.test(raw)) return '';
  return raw;
}
