import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { auth } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import './AuthPages.css';

type VerificationStatus = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
    const [status, setStatus] = useState<VerificationStatus>('verifying');
    const [message, setMessage] = useState('Verifying your email address...');

    useEffect(() => {
        let isCancelled = false;

        const token = searchParams.get('token')?.trim() || '';
        if (!token) {
            setStatus('error');
            setMessage('The verification link is missing or invalid.');
            return () => {
                isCancelled = true;
            };
        }

        const verify = async () => {
            try {
                const response = await auth.verifyEmail(token);
                if (isCancelled) {
                    return;
                }

                setStatus('success');
                setMessage(response.message);
                await checkAuth();
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                setStatus('error');
                setMessage(
                    error instanceof Error ? error.message : 'Invalid or expired link'
                );
            }
        };

        void verify();

        return () => {
            isCancelled = true;
        };
    }, [checkAuth, searchParams]);

    const primaryActionLabel =
        status === 'success' && isAuthenticated ? 'Continue to dashboard' : 'Go to sign in';
    const primaryAction = () => {
        navigate(status === 'success' && isAuthenticated ? '/dashboard' : '/login');
    };

    return (
        <div className="auth-page">
            <Card className="auth-card auth-status-card">
                <h1 className="auth-title">
                    {status === 'verifying' && 'Verifying your email'}
                    {status === 'success' && 'Email verified'}
                    {status === 'error' && 'Verification failed'}
                </h1>
                <p className="auth-subtitle">{message}</p>

                {status === 'success' && (
                    <div className="auth-success">
                        Your account is now ready. You can continue into the app or sign in if this was opened in a different browser.
                    </div>
                )}

                {status === 'error' && (
                    <div className="auth-error">
                        The verification link may be expired or already used. Request a new email and try again.
                    </div>
                )}

                <div className="auth-status-actions">
                    {status === 'verifying' ? (
                        <Button type="button" variant="primary" size="lg" isLoading={isLoading || true}>
                            Verifying
                        </Button>
                    ) : (
                        <Button type="button" variant="primary" size="lg" onClick={primaryAction}>
                            {primaryActionLabel}
                        </Button>
                    )}

                    {status === 'error' && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            onClick={() => navigate('/pending-verification')}
                        >
                            Request a new link
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}