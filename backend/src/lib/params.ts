/**
 * Helper to safely extract a route param as a string.
 * Express 5 types `req.params[key]` as `string | string[]` — we always use single segments.
 */
export function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0];
  return value ?? '';
}
