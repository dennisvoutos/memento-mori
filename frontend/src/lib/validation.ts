import { ZodError } from 'zod';

/**
 * Safely extract field-level errors from a Zod parse failure.
 * Returns null if `err` is not a ZodError.
 */
export function extractZodErrors(err: unknown): Record<string, string> | null {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    err.issues.forEach((issue) => {
      const field = String(issue.path[0] ?? '');
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    });
    return fieldErrors;
  }
  return null;
}
