/**
 * Truncate a string to `maxLen` characters, appending '…' if truncated.
 */
export function truncate(text: string, maxLen = 120): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

/**
 * Compute up to 2-character uppercase initials from a full name.
 * Handles multiple consecutive spaces safely.
 */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
