import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { buildAuthSwitchUrl } from './authRouting';
import './AuthPages.css';

export function PendingVerificationPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        hasPendingVerification,
        isAuthenticated,
        isLoading,
        pendingVerificationEmail,
        resendVerification,
        user,
    } = useAuthStore();
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const emailFromQuery = searchParams.get('email')?.trim() || null;
    const email = emailFromQuery || pendingVerificationEmail || user?.email || null;

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleResend = async () => {
        if (!email) {
            setSuccessMessage('');
            setErrorMessage('We could not find an email address to resend the verification link. Please sign in again.');
            return;
        }

        setErrorMessage('');

        try {
            const message = await resendVerification(email);
            setSuccessMessage(message);
        } catch (error) {
            setSuccessMessage('');
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to resend the verification email right now.'
            );
        }
    };

    return (
        <div className="auth-page">
            <Card className="auth-card auth-status-card">
                <h1 className="auth-title">Check your inbox</h1>
                <p className="auth-subtitle">
                    Verify your email address to finish activating your account.
                </p>

                {successMessage && <div className="auth-success">{successMessage}</div>}
                {errorMessage && <div className="auth-error">{errorMessage}</div>}

                {email && <p className="auth-email-pill">{email}</p>}

                <p className="auth-note">
                    We sent a verification link to your email address. Check your inbox and spam folder, then open the latest link we sent to continue.
                </p>
                <p className="auth-note">
                    If you recently changed your email, use your new inbox. Your existing memorials stay in your account while verification is pending.
                </p>
                {hasPendingVerification && (
                    <p className="auth-note">
                        Stay in this browser after verifying and you should be able to continue without signing in again. Until then, account actions stay locked.
                    </p>
                )}

                <div className="auth-status-actions">
                    <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        isLoading={isLoading}
                        onClick={handleResend}
                    >
                        Resend verification email
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

                <p className="auth-switch">
                    Need a different address?{' '}
                    <Link to={buildAuthSwitchUrl('/register', '/dashboard')}>Create a new account</Link>
                </p>
            </Card>
        </div>
    );
}