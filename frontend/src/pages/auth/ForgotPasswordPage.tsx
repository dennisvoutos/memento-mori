import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { forgotPasswordSchema } from '@memento-mori/shared';
import { extractZodErrors } from '../../lib/validation';
import { auth } from '../../services/api';
import './AuthPages.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    try {
      forgotPasswordSchema.parse({ email });
    } catch (err) {
      const fieldErrors = extractZodErrors(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
        return;
      }
      throw err;
    }

    setIsLoading(true);
    try {
      await auth.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-page">
        <Card className="auth-card auth-status-card">
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            If an account with that email exists, a password reset link has been sent.
          </p>
          <div className="auth-success">
            Check your inbox and follow the link to choose a new password.
            The link expires after 60 minutes.
          </div>
          <div className="auth-status-actions">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setSubmitted(false)}
            >
              Send another link
            </Button>
          </div>
          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-subtitle">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {serverError && <div className="auth-error">{serverError}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
            autoFocus
          />
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
            Send Reset Link
          </Button>
        </form>

        <p className="auth-switch">
          Remember your password?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
