import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Skeleton } from 'antd';
import { buildPendingVerificationUrl } from '../../pages/auth/authRouting';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, hasPendingVerification, isLoading, pendingVerificationEmail } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 120 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (hasPendingVerification) {
    return (
      <Navigate
        to={buildPendingVerificationUrl(pendingVerificationEmail)}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
