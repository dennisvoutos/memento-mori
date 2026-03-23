import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { CATEGORY_META } from '../lib/categories';
import { truncate } from '../lib/format';
import type { SearchResult } from '../lib/types';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, Pagination } from 'antd';
import { format } from 'date-fns';
import './BrowsePage.css';

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
            <Skeleton active paragraph={{ rows: 8 }} />
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/memorials/${r.id}`); }}
                >
                  <Avatar
                    src={r.profilePhotoUrl ?? undefined}
                    name={r.fullName}
                    size="lg"
                  />
                  <div className="browse-result-info">
                    <h3 className="browse-result-name">{r.fullName}</h3>
                    <span className="browse-result-dates">
                      {r.dateOfBirth
                        ? format(new Date(r.dateOfBirth), 'MMM d, yyyy')
                        : ''}
                      {r.dateOfBirth && r.dateOfPassing ? ' — ' : ''}
                      {r.dateOfPassing
                        ? format(new Date(r.dateOfPassing), 'MMM d, yyyy')
                        : ''}
                    </span>
                    {r.biography && (
                      <p className="browse-result-bio">
                        {truncate(r.biography)}
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
