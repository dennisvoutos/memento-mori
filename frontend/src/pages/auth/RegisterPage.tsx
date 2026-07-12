import { useState } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  getSignupEmailProviderWarning,
  registerFormSchema,
  TERMS_ACCEPTANCE_MESSAGE,
} from '@memento-mori/shared';
import { extractZodErrors } from '../../lib/validation';
import {
  buildAuthSwitchUrl,
  buildPendingVerificationUrl,
  getGoogleAuthErrorMessage,
  resolveAuthRedirectTo,
} from './authRouting';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AppleSignInButton } from './AppleSignInButton';
import './AuthPages.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    hasPendingVerification,
    isAuthenticated,
    pendingVerificationEmail,
    register,
    loginWithGoogleCredential,
    isLoading,
  } = useAuthStore();
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const redirectTo = resolveAuthRedirectTo(location);
  const searchParams = new URLSearchParams(location.search);
  const googleErrorMessage = getGoogleAuthErrorMessage(
    searchParams.get('authError')
  );
  const visibleError = serverError || googleErrorMessage;
  const emailProviderWarning = errors.email
    ? null
    : getSignupEmailProviderWarning(form.email);

  const clearAcceptedTermsError = () => {
    setErrors((currentErrors) => {
      if (!currentErrors.acceptedTerms) {
        return currentErrors;
      }

      const { acceptedTerms, ...nextErrors } = currentErrors;
      void acceptedTerms;
      return nextErrors;
    });
  };

  const requireAcceptedTerms = () => {
    setErrors((currentErrors) => ({
      ...currentErrors,
      acceptedTerms: TERMS_ACCEPTANCE_MESSAGE,
    }));
  };

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (hasPendingVerification) {
    return <Navigate to={buildPendingVerificationUrl(pendingVerificationEmail)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    try {
      registerFormSchema.parse(form);
    } catch (err) {
      const fieldErrors = extractZodErrors(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
        return;
      }
      throw err;
    }

    try {
      const registeredUser = await register(
        form.displayName,
        form.email,
        form.password,
        form.acceptedTerms
      );
      navigate(
        registeredUser.emailVerified
          ? redirectTo
          : buildPendingVerificationUrl(registeredUser.email),
        { replace: true }
      );
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setServerError('');

    if (!form.acceptedTerms) {
      requireAcceptedTerms();
      return;
    }

    await loginWithGoogleCredential(credential);
    navigate(redirectTo);
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1 className="auth-title">Create Your Account</h1>
        <p className="auth-subtitle">
          Begin preserving the memories that matter most.
        </p>

        {visibleError && <div className="auth-error">{visibleError}</div>}

        <div className="auth-google-gated">
          <GoogleAuthButton
            label="Sign up with Google"
            text="signup_with"
            isBusy={isLoading}
            onCredential={handleGoogleCredential}
            onError={setServerError}
          />
          <AppleSignInButton
            label="Sign up with Apple"
            isBusy={isLoading}
            onError={setServerError}
            redirectTo={redirectTo}
          />
          {!form.acceptedTerms && (
            <button
              type="button"
              className="auth-google-gate"
              onClick={requireAcceptedTerms}
              aria-label="Accept the Privacy Policy and Terms of Service before signing up with Google or Apple"
            >
              Accept the policies below to continue.
            </button>
          )}
        </div>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Display Name"
            type="text"
            placeholder="Your name"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            error={errors.displayName}
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email}
            helperText={emailProviderWarning ?? undefined}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={errors.password}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, confirmPassword: e.target.value }))
            }
            error={errors.confirmPassword}
            required
          />
          <div className="auth-terms-field">
            <div className="auth-terms-control">
              <input
                id="register-accepted-terms"
                className="auth-terms-checkbox"
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={(e) => {
                  const acceptedTerms = e.target.checked;
                  setForm((currentForm) => ({
                    ...currentForm,
                    acceptedTerms,
                  }));

                  if (acceptedTerms) {
                    clearAcceptedTermsError();
                  }
                }}
              />
              <label
                htmlFor="register-accepted-terms"
                className="auth-terms-label"
              >
                I accept the{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms of Service
                </Link>
                .
              </label>
            </div>
            {errors.acceptedTerms && (
              <p className="auth-terms-error">{errors.acceptedTerms}</p>
            )}
          </div>
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to={buildAuthSwitchUrl('/login', redirectTo)}>Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
