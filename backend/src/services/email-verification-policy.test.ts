import { describe, expect, it } from 'vitest';
import { doesEmailRequireVerification } from './email-verification-policy.js';

describe('doesEmailRequireVerification', () => {
  it('does not require verification for gmail.com addresses', () => {
    expect(doesEmailRequireVerification('person@gmail.com')).toBe(false);
  });

  it('does not require verification for googlemail.com addresses', () => {
    expect(doesEmailRequireVerification('person@googlemail.com')).toBe(false);
  });

  it('still requires verification for other providers', () => {
    expect(doesEmailRequireVerification('person@outlook.com')).toBe(true);
  });
});
