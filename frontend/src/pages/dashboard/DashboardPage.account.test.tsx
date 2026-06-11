import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { getProfileUpdateCompletion } from './profileUpdateFlow';

describe('DashboardPage account email verification flow', () => {
  it('returns a verification redirect when the updated user is no longer verified', () => {
    expect(
      getProfileUpdateCompletion({
        email: 'new@test.com',
        emailVerified: false,
      })
    ).toEqual({
      successMessage: 'Email updated. Verify your new address to continue.',
      redirectTo: '/pending-verification?email=new%40test.com',
    });
  });

  it('keeps verified profile updates on the dashboard', () => {
    expect(
      getProfileUpdateCompletion({
        email: 'same@test.com',
        emailVerified: true,
      })
    ).toEqual({
      successMessage: 'Profile updated',
      redirectTo: null,
    });
  });
});