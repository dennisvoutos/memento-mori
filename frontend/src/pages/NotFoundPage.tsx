import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)',
        padding: 24,
      }}
    >
      <EmptyState
        title="Page Not Found"
        description="The page you're looking for doesn't exist or has been moved."
        action={{ label: 'Go Home', onClick: () => navigate('/') }}
      />
    </div>
  );
}
