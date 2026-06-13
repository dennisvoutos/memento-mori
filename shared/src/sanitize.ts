/**
 * Strips HTML tags, decodes common HTML entities, and trims whitespace
 * from user-supplied text to prevent stored XSS.
 */
export function sanitizeText(value: string): string {
  // Strip all HTML tags
  let cleaned = value.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
  // Trim whitespace
  return cleaned.trim();
}
