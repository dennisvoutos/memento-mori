import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { resetPasswordSchema } from '@memento-mori/shared';
import { extractZodErrors } from '../../lib/validation';
import { auth } from '../../services/api';
import './AuthPages.css';

type ResetStatus = 'validating' | 'invalid' | 'valid' | 'submitting' | 'success' | 'error';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';

  const [status, setStatus] = useState<ResetStatus>('validating');
  const [message, setMessage] = useState('Verifying your reset link...');
  const [form, setForm] = useState({ newPassword: '', confirmNewPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    if (!token) {
      setStatus('invalid');
      setMessage('The reset link is missing or invalid.');
      return;
    }

    const validate = async () => {
      try {
        const result = await auth.validateResetToken(token);
        if (isCancelled) return;

        if (result.valid) {
          setStatus('valid');
          setMessage('');
        } else {
          setStatus('invalid');
          setMessage('This reset link is invalid or has expired.');
        }
      } catch {
        if (isCancelled) return;
        setStatus('invalid');
        setMessage('This reset link is invalid or has expired.');
      }
    };

    void validate();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      resetPasswordSchema.parse({ token, ...form });
    } catch (err) {
      const fieldErrors = extractZodErrors(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
        return;
      }
      throw err;
    }

    setStatus('submitting');
    try {
      await auth.resetPassword({
        token,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmNewPassword,
      });
      setStatus('success');
      setMessage('Your password has been reset successfully.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (status === 'validating') {
    return (
      <div className="auth-page">
        <Card className="auth-card auth-status-card">
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-subtitle">{message}</p>
          <div className="auth-status-actions">
            <Button type="button" variant="primary" size="lg" isLoading={true}>
              Verifying
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="auth-page">
        <Card className="auth-card auth-status-card">
          <h1 className="auth-title">Reset link expired</h1>
          <p className="auth-subtitle">{message}</p>
          <div className="auth-error">
            Reset links are valid for 60 minutes and can only be used once.
            Request a new link and try again.
          </div>
          <div className="auth-status-actions">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => navigate('/forgot-password')}
            >
              Request a new link
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => navigate('/login')}
            >
              Back to sign in
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="auth-page">
        <Card className="auth-card auth-status-card">
          <h1 className="auth-title">Password reset</h1>
          <p className="auth-subtitle">{message}</p>
          <div className="auth-success">
            You can now sign in with your new password.
          </div>
          <div className="auth-status-actions">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => navigate('/login')}
            >
              Go to sign in
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1 className="auth-title">Choose a new password</h1>
        <p className="auth-subtitle">
          Enter your new password below.
        </p>

        {(status === 'error' && message) && (
          <div className="auth-error">{message}</div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            value={form.newPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, newPassword: e.target.value }))
            }
            error={errors.newPassword}
            required
            autoFocus
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter your new password"
            value={form.confirmNewPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, confirmNewPassword: e.target.value }))
            }
            error={errors.confirmNewPassword}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={status === 'submitting'}
          >
            Reset password
          </Button>
        </form>
      </Card>
    </div>
  );
}
