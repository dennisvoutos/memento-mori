import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { api } from '../../../services/api';
import { resolveMediaUrl } from '../../../lib/media';
import { getInitials } from '../../../lib/format';
import './FeaturedMemorials.css';

interface PublicMemorial {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string;
  dateOfPassing: string;
}

function yearOf(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString();
}

export function FeaturedMemorials() {
  const navigate = useNavigate();
  const [memorials, setMemorials] = useState<PublicMemorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.search
      .memorials('', 1, 6)
      .then((data) => setMemorials(data.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <section className="landing-section" aria-label="Featured memorials">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <a href="/browse" style={{ color: 'var(--lp-primary)' }}>
            View all memorials →
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="landing-section featured-memorials" aria-label="Featured memorials">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">Their Stories</h2>
        <p className="landing-section-subtitle">
          Recently created memorials by families like yours.
        </p>

        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : memorials.length === 0 ? (
          <div className="fm-empty">
            <p>No memorials yet. Be the first to create one!</p>
            <button
              className="icta-button"
              onClick={() => navigate('/register')}
              type="button"
            >
              Create a Memorial
            </button>
          </div>
        ) : (
          <div className="fm-scroll" ref={scrollRef}>
            {memorials.map((m) => {
              const photoUrl = m.profilePhotoUrl
                ? resolveMediaUrl(m.profilePhotoUrl)
                : null;
              const initials = getInitials(m.fullName);

              return (
                <div
                  className="fm-card"
                  key={m.id}
                  onClick={() => navigate(`/memorials/${m.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/memorials/${m.id}`);
                  }}
                >
                  <div className="fm-portrait">
                    {photoUrl ? (
                      <img src={photoUrl} alt={m.fullName} />
                    ) : (
                      <span className="fm-initials">{initials}</span>
                    )}
                  </div>
                  <h3 className="fm-name">{m.fullName}</h3>
                  {m.dateOfBirth && m.dateOfPassing && (
                    <p className="fm-dates">
                      {yearOf(m.dateOfBirth)}&ndash;{yearOf(m.dateOfPassing)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <a href="/browse" className="fm-view-all">
          View all memorials →
        </a>
      </div>
    </section>
  );
}
