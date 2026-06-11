import { normalizeEmail } from './auth-account-linking.js';

const AUTO_VERIFIED_EMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

export function doesEmailRequireVerification(email: string): boolean {
  const normalizedEmail = normalizeEmail(email);
  const atIndex = normalizedEmail.lastIndexOf('@');

  if (atIndex <= 0 || atIndex === normalizedEmail.length - 1) {
    return true;
  }

  const domain = normalizedEmail.slice(atIndex + 1);
  return !AUTO_VERIFIED_EMAIL_DOMAINS.has(domain);
}
