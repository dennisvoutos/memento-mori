import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { Avatar } from '../components/ui/Avatar';
import {
  HeartOutlined,
  StarOutlined,
  EditOutlined,
  BookOutlined,
  CustomerServiceOutlined,
  CameraOutlined,
  TeamOutlined,
  GlobalOutlined,
  FireOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import './LandingPage.css';

const categories = [
  { label: 'In Loving Memory', icon: <HeartOutlined /> },
  { label: 'Tributes', icon: <StarOutlined /> },
  { label: 'Life Stories', icon: <EditOutlined /> },
  { label: 'Obituaries', icon: <BookOutlined /> },
  { label: 'Music & Songs', icon: <CustomerServiceOutlined /> },
  { label: 'Photo Galleries', icon: <CameraOutlined /> },
  { label: 'Community', icon: <TeamOutlined /> },
  { label: 'Global Memorials', icon: <GlobalOutlined /> },
  { label: 'Candlelight', icon: <FireOutlined /> },
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

  useEffect(() => {
    // Load recent public memorials for the landing page
    api.search
      .memorials('', 1, 6)
      .then((data) => {
        setRecentMemorials(data.items);
        setTotalCount(data.total);
      })
      .catch(() => {});
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

          <div className="memorials-row">
            {recentMemorials.length > 0 ? (
              recentMemorials.map((m) => (
                <div
                  className="memorial-card"
                  key={m.id}
                  onClick={() => navigate(`/memorials/${m.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Avatar
                    src={m.profilePhotoUrl ?? undefined}
                    name={m.fullName}
                    size="lg"
                  />
                  <span className="memorial-name">{m.fullName}</span>
                </div>
              ))
            ) : (
              <p className="no-memorials-hint">
                No public memorials yet. Be the first to create one!
              </p>
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
              <div className="category-card" key={c.label}>
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
