import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
// PrivacyLevel type used via privacyBadge mapping
import './DashboardPage.css';

const privacyBadge: Record<string, 'private' | 'shared' | 'public'> = {
  PRIVATE: 'private',
  SHARED_LINK: 'shared',
  PUBLIC: 'public',
};

const privacyLabel: Record<string, string> = {
  PRIVATE: 'Private',
  SHARED_LINK: 'Shared Link',
  PUBLIC: 'Public',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { memorials, isLoading, error, fetchMyMemorials } = useMemorialStore();

  useEffect(() => {
    fetchMyMemorials();
  }, [fetchMyMemorials]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.displayName?.split(' ')[0] ?? 'friend'}</h1>
          <p className="dashboard-subtitle">
            {memorials.length === 0
              ? 'Create your first memorial to get started.'
              : `You have ${memorials.length} memorial${memorials.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/memorials/new')}>
          <PlusOutlined /> New Memorial
        </Button>
      </div>

      {isLoading ? (
        <div className="dashboard-loading">
          <Spin size="large" />
        </div>
      ) : error ? (
        <Card className="dashboard-error">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchMyMemorials}>
            Retry
          </Button>
        </Card>
      ) : memorials.length === 0 ? (
        <EmptyState
          title="No memorials yet"
          description="Create a memorial to begin honoring and remembering someone special."
          action={{ label: 'Create Memorial', onClick: () => navigate('/memorials/new') }}
        />
      ) : (
        <div className="memorial-grid">
          {memorials.map((m) => (
            <Link
              to={`/memorials/${m.id}`}
              key={m.id}
              className="memorial-link"
            >
              <Card className="dashboard-memorial-card">
                <div className="memorial-card-header">
                  <Avatar
                    src={m.profilePhotoUrl ?? undefined}
                    name={m.fullName}
                    size="lg"
                  />
                  <Badge variant={privacyBadge[m.privacyLevel] ?? 'private'}>
                    {privacyLabel[m.privacyLevel] ?? m.privacyLevel}
                  </Badge>
                </div>
                <h3 className="memorial-card-name">{m.fullName}</h3>
                {(m.dateOfBirth || m.dateOfPassing) && (
                  <p className="memorial-card-dates">
                    {m.dateOfBirth
                      ? format(new Date(m.dateOfBirth), 'MMM d, yyyy')
                      : '?'}
                    {' — '}
                    {m.dateOfPassing
                      ? format(new Date(m.dateOfPassing), 'MMM d, yyyy')
                      : 'present'}
                  </p>
                )}
                {m.biography && (
                  <p className="memorial-card-bio">
                    {m.biography.length > 100
                      ? m.biography.slice(0, 100) + '…'
                      : m.biography}
                  </p>
                )}
                <div className="memorial-card-footer">
                  <span className="memorial-card-date">
                    Created {format(new Date(m.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
