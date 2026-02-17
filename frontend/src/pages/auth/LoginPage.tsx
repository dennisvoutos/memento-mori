import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { loginSchema } from '@memento-mori/shared';
import type { ZodIssue } from 'zod';
import './AuthPages.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    try {
      loginSchema.parse(form);
    } catch (err) {
      const zodError = err as { issues: ZodIssue[] };
      const fieldErrors: Record<string, string> = {};
      zodError.issues.forEach((issue: ZodIssue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          Sign in to manage your memorials.
        </p>

        {serverError && <div className="auth-error">{serverError}</div>}

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
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </Card>
    </div>
  );
}
