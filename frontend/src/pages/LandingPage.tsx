import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { MemorialCategory } from '@memento-mori/shared';
import { resolveMediaUrl } from '../lib/media';
import { Skeleton } from 'antd';
import {
  HeartOutlined,
  MedicineBoxOutlined,
  AlertOutlined,
  CarOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  FrownOutlined,
  AppstoreOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import './LandingPage.css';

const categories = [
  { label: 'Heart Disease', icon: <HeartOutlined />, value: MemorialCategory.HEART_DISEASE },
  { label: 'Cancer', icon: <MedicineBoxOutlined />, value: MemorialCategory.CANCER },
  { label: 'COVID-19', icon: <AlertOutlined />, value: MemorialCategory.COVID_19 },
  { label: 'Accident', icon: <CarOutlined />, value: MemorialCategory.ACCIDENT },
  { label: 'Stroke', icon: <ThunderboltOutlined />, value: MemorialCategory.STROKE },
  { label: 'Respiratory', icon: <ExperimentOutlined />, value: MemorialCategory.RESPIRATORY_DISEASE },
  { label: 'Alzheimer\'s', icon: <QuestionCircleOutlined />, value: MemorialCategory.ALZHEIMERS_DEMENTIA },
  { label: 'Diabetes', icon: <MedicineBoxOutlined />, value: MemorialCategory.DIABETES },
  { label: 'Suicide', icon: <FrownOutlined />, value: MemorialCategory.SUICIDE },
  { label: 'Kidney Disease', icon: <WarningOutlined />, value: MemorialCategory.KIDNEY_DISEASE },
  { label: 'Other', icon: <AppstoreOutlined />, value: MemorialCategory.OTHER },
];

interface PublicMemorial {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
}

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [recentMemorials, setRecentMemorials] = useState<PublicMemorial[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMemorials, setLoadingMemorials] = useState(true);

  useEffect(() => {
    // Load recent public memorials for the landing page
    api.search
      .memorials('', 1, 6)
      .then((data) => {
        setRecentMemorials(data.items);
        setTotalCount(data.total);
      })
      .catch(() => {})
      .finally(() => setLoadingMemorials(false));
  }, []);

  const handleCreateMemorial = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/memorials/new');
    } else {
      navigate('/register');
    }
  };

  const handleGetStarted = () => {
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
      {/* announcement strip */}
      <div className="announcement-strip">
        Preserve the memory of your loved ones forever.{' '}
        <a href="/about">Learn more &rarr;</a>
      </div>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-card">
          <h1>Create a Lasting Memorial for Someone You Love</h1>
          <p className="subtitle">
            A quiet, beautiful space to honor and remember those who have
            touched our lives — share stories, photos, and keep their memory
            alive forever.
          </p>

          <form className="hero-form" onSubmit={handleCreateMemorial}>
            <input type="text" placeholder="First name" />
            <input type="text" placeholder="Last name" />
            <button className="btn-primary" type="submit">
              Create a Free Memorial
            </button>
          </form>

          <div className="hero-divider">
            <span>or search for a memorial</span>
          </div>

          <form className="hero-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn-secondary-outline" type="submit">
              <SearchOutlined /> Search
            </button>
          </form>
        </div>
      </section>

      {/* ── RECENT MEMORIALS ── */}
      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Recent Online Memorials</h2>
          <p className="section-subtitle">
            Honoring lives that continue to inspire and comfort us.
          </p>

          {loadingMemorials ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
          <div className="memorials-grid">
            {recentMemorials.length > 0 ? (
              recentMemorials.map((m) => {
                const photoUrl = m.profilePhotoUrl
                  ? resolveMediaUrl(m.profilePhotoUrl)
                  : null;
                return (
                  <div
                    className="memorial-square-card"
                    key={m.id}
                    onClick={() => navigate(`/memorials/${m.id}`)}
                    style={
                      photoUrl
                        ? { backgroundImage: `url(${photoUrl})` }
                        : undefined
                    }
                  >
                    {!photoUrl && (
                      <div className="memorial-square-initials">
                        {m.fullName
                          .split(' ')
                          .map((w: string) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="memorial-square-overlay">
                      <span className="memorial-square-name">
                        {m.fullName}
                      </span>
                    </div>
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

          {totalCount > 0 && (
            <div className="community-stats">
              <div className="stat-item">
                <div className="stat-number">{totalCount}</div>
                <div className="stat-label">Public Memorials</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURED CATEGORIES ── */}
      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">Featured Categories</h2>
          <p className="section-subtitle">
            Explore different ways to remember and celebrate a life.
          </p>

          <div className="categories-grid">
            {categories.map((c) => (
              <div
                className="category-card"
                key={c.label}
                onClick={() => navigate(`/browse?category=${c.value}`)}
                style={{ cursor: 'pointer' }}
              >
                <span className="category-icon">{c.icon}</span>
                <span className="category-label">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bottom-cta">
        <div className="bottom-cta-card">
          <h2>Their Story Deserves to Be Told</h2>
          <p>
            Create a free, beautiful memorial page in minutes. Share it with
            family and friends so that their memory lives on.
          </p>
          <button className="btn-primary" onClick={handleGetStarted} type="button">
            Get Started — It's Free
          </button>
        </div>
      </section>
    </>
  );
}
