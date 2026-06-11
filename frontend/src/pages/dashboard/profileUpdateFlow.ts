import type { User } from '@memento-mori/shared';
import { buildPendingVerificationUrl } from '../auth/authRouting';

interface ProfileUpdateCompletion {
  successMessage: string;
  redirectTo: string | null;
}

export function getProfileUpdateCompletion(
  user: Pick<User, 'email' | 'emailVerified'>
): ProfileUpdateCompletion {
  if (!user.emailVerified) {
    return {
      successMessage: 'Email updated. Verify your new address to continue.',
      redirectTo: buildPendingVerificationUrl(user.email),
    };
  }

  return {
    successMessage: 'Profile updated',
    redirectTo: null,
  };
}