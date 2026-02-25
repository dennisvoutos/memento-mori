import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { MemorialCategory } from '@memento-mori/shared';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { Spin, Pagination } from 'antd';
import {
  HeartOutlined,
  StarOutlined,
  EditOutlined,
  BookOutlined,
  TeamOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import './BrowsePage.css';

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  [MemorialCategory.IN_LOVING_MEMORY]: {
    label: 'In Loving Memory',
    icon: <HeartOutlined />,
    description: 'Memorials created to honor and remember loved ones.',
  },
  [MemorialCategory.TRIBUTE]: {
    label: 'Tributes',
    icon: <StarOutlined />,
    description: 'Public tributes celebrating lives well lived.',
  },
  [MemorialCategory.LIFE_STORY]: {
    label: 'Life Stories',
    icon: <EditOutlined />,
    description: 'Rich biographical memorials telling the full story of a life.',
  },
  [MemorialCategory.OBITUARY]: {
    label: 'Obituaries',
    icon: <BookOutlined />,
    description: 'Traditional obituary-style memorials.',
  },
  [MemorialCategory.COMMUNITY]: {
    label: 'Community',
    icon: <TeamOutlined />,
    description: 'Community-driven memorials for public figures and shared losses.',
  },
  [MemorialCategory.OTHER]: {
    label: 'Other',
    icon: <AppstoreOutlined />,
    description: 'Memorials that don\'t fit a specific category.',
  },
};

interface SearchResult {
  id: string;
  fullName: string;
  dateOfBirth: string;
  dateOfPassing: string;
  biography: string | null;
  profilePhotoUrl: string | null;
  category?: string;
  createdAt: string;
}

export function BrowsePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMemorials = async () => {
      setLoading(true);
      try {
        const data = await api.search.memorials('', page, 12, activeCategory || undefined);
        setResults(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMemorials();
  }, [activeCategory, page]);

  const handleCategoryClick = (cat: string) => {
    if (cat === activeCategory) {
      setSearchParams({});
    } else {
      setSearchParams({ category: cat });
    }
    setPage(1);
  };

  const meta = activeCategory ? CATEGORY_META[activeCategory] : null;

  return (
    <div className="browse-page">
      <div className="browse-inner">
        <h1>Browse Memorials</h1>
        <p className="browse-subtitle">
          Explore public memorials by category.
        </p>

        {/* Category filters */}
        <div className="browse-categories">
          {Object.entries(CATEGORY_META).map(([key, cat]) => (
            <button
              key={key}
              className={`browse-category-chip ${activeCategory === key ? 'active' : ''}`}
              onClick={() => handleCategoryClick(key)}
              type="button"
            >
              <span className="chip-icon">{cat.icon}</span>
              <span className="chip-label">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Active category description */}
        {meta && (
          <div className="browse-category-info">
            <span className="category-info-icon">{meta.icon}</span>
            <div>
              <h2>{meta.label}</h2>
              <p>{meta.description}</p>
            </div>
          </div>
        )}

        {/* Results count */}
        {!loading && total > 0 && (
          <p className="browse-count">
            {total} memorial{total !== 1 ? 's' : ''} found
            {meta ? ` in ${meta.label}` : ''}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="browse-loading">
            <Spin size="large" />
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && (
          <EmptyState
            title="No memorials found"
            description={
              meta
                ? `No public memorials in "${meta.label}" yet. Be the first to create one.`
                : 'No public memorials yet. Be the first to create one!'
            }
            action={{ label: 'Create Memorial', onClick: () => navigate('/memorials/new') }}
          />
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <>
            <div className="browse-results">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="browse-result-card"
                  onClick={() => navigate(`/memorials/${r.id}`)}
                >
                  <Avatar
                    src={r.profilePhotoUrl ?? undefined}
                    name={r.fullName}
                    size="lg"
                  />
                  <div className="browse-result-info">
                    <h3 className="browse-result-name">{r.fullName}</h3>
                    <span className="browse-result-dates">
                      {r.dateOfBirth} — {r.dateOfPassing}
                    </span>
                    {r.biography && (
                      <p className="browse-result-bio">
                        {r.biography.length > 120
                          ? `${r.biography.slice(0, 120)}…`
                          : r.biography}
                      </p>
                    )}
                  </div>
                  <span className="browse-result-date">
                    {format(new Date(r.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="browse-pagination">
                <Pagination
                  current={page}
                  total={total}
                  pageSize={12}
                  onChange={(p) => setPage(p)}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
