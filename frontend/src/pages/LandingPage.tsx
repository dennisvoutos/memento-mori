import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { CATEGORY_LIST } from '../lib/categories';
import { getInitials } from '../lib/format';
import { resolveMediaUrl } from '../lib/media';
import { Skeleton } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './LandingPage.css';

interface PublicMemorial {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string;
  dateOfPassing: string;
}

/** Extract just the year from an ISO date string */
function yearOf(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString();
}

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [recentMemorials, setRecentMemorials] = useState<PublicMemorial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMemorials, setLoadingMemorials] = useState(true);

  useEffect(() => {
    api.search
      .memorials('', 1, 6)
      .then((data) => {
        setRecentMemorials(data.items);
      })
      .catch(() => { })
      .finally(() => setLoadingMemorials(false));
  }, []);

  const handleCreateMemorial = () => {
    if (isAuthenticated) {
      navigate('/memorials/new');
    } else {
      navigate('/register');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-hero-overlay" />
        <div className="landing-hero-content">
          <div className="landing-hero-logo" aria-hidden="true">
            <img
              src="/logo-no-background.png"
              alt=""
              className="landing-hero-logo-image"
              loading="eager"
            />
          </div>
          <h1 className="landing-hero-headline">Honoring Every Story.</h1>
          <p className="landing-hero-sub">
            A quiet, beautiful space to remember and celebrate those who shaped
            our lives.
          </p>

          <form className="landing-hero-search" onSubmit={handleSearch}>
            <SearchOutlined className="landing-search-icon" />
            <input
              type="text"
              placeholder="Search for a memorial…"
              aria-label="Search for a memorial"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="landing-search-btn">
              Search
            </button>
          </form>

          <button
            className="landing-hero-cta"
            onClick={handleCreateMemorial}
            type="button"
          >
            Create a Memorial
          </button>
        </div>
      </section>

      {/* ── RECENT MEMORIALS ── */}
      <section className="landing-section landing-recent">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Recent Memorials</h2>
          <p className="landing-section-subtitle">
            Honoring lives that continue to inspire and comfort us.
          </p>

          {loadingMemorials ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <div className="landing-grid">
              {recentMemorials.length > 0 ? (
                recentMemorials.map((m) => {
                  const photoUrl = m.profilePhotoUrl
                    ? resolveMediaUrl(m.profilePhotoUrl)
                    : null;
                  const initials = getInitials(m.fullName);

                  return (
                    <div
                      className="landing-card"
                      key={m.id}
                      onClick={() => navigate(`/memorials/${m.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/memorials/${m.id}`); }}
                    >
                      <div className="landing-card-portrait">
                        {photoUrl ? (
                          <img src={photoUrl} alt={m.fullName} />
                        ) : (
                          <span className="landing-card-initials">
                            {initials}
                          </span>
                        )}
                      </div>
                      <h3 className="landing-card-name">{m.fullName}</h3>
                      {m.dateOfBirth && m.dateOfPassing && (
                        <p className="landing-card-dates">
                          {yearOf(m.dateOfBirth)}–{yearOf(m.dateOfPassing)}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="no-memorials-hint">
                  No public memorials yet. Be the first to create one!
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURED CATEGORIES ── */}
      <section className="landing-section landing-categories">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Featured Categories</h2>
          <p className="landing-section-subtitle">
            Explore different ways to remember and celebrate a life.
          </p>

          <div className="landing-cats-grid">
            {CATEGORY_LIST.map((c) => (
              <div
                className="landing-cat-card"
                key={c.label}
                onClick={() => navigate(`/browse?category=${c.value}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/browse?category=${c.value}`); }}
              >
                <span className="landing-cat-icon">{c.icon}</span>
                <span className="landing-cat-label">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="landing-section landing-bottom-cta">
        <div className="landing-section-inner">
          <div className="landing-cta-box">
            <h2>Their Story Deserves to Be Told</h2>
            <p>
              Create a free, beautiful memorial page in minutes. Share it with
              family and friends so that their memory lives on.
            </p>
            <button
              className="landing-hero-cta"
              onClick={handleCreateMemorial}
              type="button"
            >
              Get Started — It's Free
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
