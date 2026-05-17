import { useState } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { registerFormSchema } from '@memento-mori/shared';
import { extractZodErrors } from '../../lib/validation';
import './AuthPages.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, register, isLoading } = useAuthStore();
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const redirectTo = (() => {
    const state = location.state as {
      from?: { pathname?: string; search?: string; hash?: string };
    } | null;

    if (!state?.from?.pathname) {
      return '/dashboard';
    }

    return `${state.from.pathname}${state.from.search ?? ''}${state.from.hash ?? ''}`;
  })();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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
      await register(form.displayName, form.email, form.password);
      navigate(redirectTo);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1 className="auth-title">Create Your Account</h1>
        <p className="auth-subtitle">
          Begin preserving the memories that matter most.
        </p>

        {serverError && <div className="auth-error">{serverError}</div>}

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
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
