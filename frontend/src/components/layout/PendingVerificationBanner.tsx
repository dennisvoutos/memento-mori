import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { buildPendingVerificationUrl } from '../../pages/auth/authRouting';

const HIDDEN_PATHS = new Set(['/pending-verification', '/verify-email']);

export function PendingVerificationBanner() {
  const location = useLocation();
  const { hasPendingVerification, pendingVerificationEmail, user } = useAuthStore();

  if (!hasPendingVerification || HIDDEN_PATHS.has(location.pathname)) {
    return null;
  }

  const email = pendingVerificationEmail ?? user?.email ?? null;

  return (
    <section className="pending-verification-banner" role="status" aria-live="polite">
      <div className="pending-verification-banner__inner">
        <div className="pending-verification-banner__copy">
          <strong>Verify your email to unlock account actions.</strong>
          <span>
            {email ? `We are waiting for ${email} to be confirmed. ` : 'We are waiting for your email to be confirmed. '}
            Until then, actions like creating or editing memorials stay locked. Your existing memorials remain safe.
          </span>
        </div>
        <Link
          className="pending-verification-banner__action"
          to={buildPendingVerificationUrl(email)}
        >
          Open verification help
        </Link>
      </div>
    </section>
  );
}