import { useState } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { loginSchema } from '@memento-mori/shared';
import { extractZodErrors } from '../../lib/validation';
import {
  buildAuthSwitchUrl,
  getGoogleAuthErrorMessage,
  resolveAuthRedirectTo,
} from './authRouting';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useAppNotifications } from '../../lib/notifications';
import './AuthPages.css';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useAppNotifications();
  const { isAuthenticated, login, loginWithGoogleCredential, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const redirectTo = resolveAuthRedirectTo(location);
  const searchParams = new URLSearchParams(location.search);
  const googleErrorMessage = getGoogleAuthErrorMessage(
    searchParams.get('authError')
  );
  const visibleError = serverError || googleErrorMessage;

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    try {
      loginSchema.parse(form);
    } catch (err) {
      const fieldErrors = extractZodErrors(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
        return;
      }
      throw err;
    }

    try {
      await login(form.email, form.password);
      notifications.login();
      navigate(redirectTo);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setServerError('');
    await loginWithGoogleCredential(credential);
    notifications.login();
    navigate(redirectTo);
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          Sign in to manage your memorials.
        </p>

        {visibleError && <div className="auth-error">{visibleError}</div>}

        <GoogleAuthButton
          label="Log in with Google"
          text="signin_with"
          isBusy={isLoading}
          onCredential={handleGoogleCredential}
          onError={setServerError}
        />

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email}
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={errors.password}
            required
          />
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to={buildAuthSwitchUrl('/register', redirectTo)}>Create one</Link>
        </p>
      </Card>
    </div>
  );
}
