import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { Spin } from 'antd';
import { EmptyState } from '../../components/ui/EmptyState';

/**
 * Resolves a shared access token and redirects to the memorial page.
 */
export function SharedMemorialPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { currentMemorial, isLoading, error, fetchMemorialByToken, clearCurrent } =
    useMemorialStore();

  useEffect(() => {
    if (token) fetchMemorialByToken(token);
    return () => clearCurrent();
  }, [token, fetchMemorialByToken, clearCurrent]);

  useEffect(() => {
    if (currentMemorial) {
      navigate(`/memorials/${currentMemorial.id}`, { replace: true });
    }
  }, [currentMemorial, navigate]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <Spin size="large" />
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
