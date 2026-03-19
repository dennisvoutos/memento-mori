import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { Skeleton } from 'antd';
import { EmptyState } from '../../components/ui/EmptyState';

/**
 * Resolves a shared access token and redirects to the memorial page.
 */
export function SharedMemorialPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { currentMemorial, isLoading, error, fetchMemorialByToken } =
    useMemorialStore();

  useEffect(() => {
    if (token) fetchMemorialByToken(token);
    // Don't clearCurrent on unmount — MemorialPage will pick up the loaded memorial
  }, [token, fetchMemorialByToken]);

  useEffect(() => {
    if (currentMemorial) {
      navigate(`/memorials/${currentMemorial.id}?token=${token}`, { replace: true });
    }
  }, [currentMemorial, navigate, token]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 120 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <EmptyState
          title="Link expired or invalid"
          description="This shared memorial link is no longer valid."
          action={{ label: 'Go Home', onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  return null;
}
