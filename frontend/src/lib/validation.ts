import { ZodError } from 'zod';

interface ZodIssueLike {
  path?: unknown[];
  message?: unknown;
}

function isZodErrorLike(err: unknown): err is { issues: ZodIssueLike[] } {
  if (!(err instanceof ZodError) && (!err || typeof err !== 'object')) {
    return false;
  }

  const issues = (err as { issues?: unknown }).issues;
  return Array.isArray(issues);
}

/**
 * Safely extract field-level errors from a Zod parse failure.
 * Returns null if `err` is not a ZodError.
 */
export function extractZodErrors(err: unknown): Record<string, string> | null {
  if (isZodErrorLike(err)) {
    const fieldErrors: Record<string, string> = {};
    err.issues.forEach((issue) => {
      const fieldPath = Array.isArray(issue.path) ? issue.path : [];
      const field = String(fieldPath[0] ?? '');
      const message = typeof issue.message === 'string' ? issue.message : '';

      if (field && message && !fieldErrors[field]) {
        fieldErrors[field] = message;
      }
    });
    return fieldErrors;
  }
  return null;
}
