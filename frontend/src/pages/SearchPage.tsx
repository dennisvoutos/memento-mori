import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { Spin, Pagination } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import './SearchPage.css';

interface SearchResult {
  id: string;
  fullName: string;
  dateOfBirth: string;
  dateOfPassing: string;
  biography: string | null;
  profilePhotoUrl: string | null;
  createdAt: string;
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
      setSearched(false);
      setSearchParams({});
      return;
    }

    setSearchParams({ q: debouncedQuery });

    const search = async () => {
      setLoading(true);
      try {
        const data = await api.search.memorials(debouncedQuery.trim(), page);
        setResults(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setSearched(true);
      } catch {
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery, page, setSearchParams]);

  return (
    <div className="search-page">
      <div className="search-inner">
        <h1>Search Memorials</h1>
        <p className="search-subtitle">
          Find public memorials by the name of the person being remembered.
        </p>

        <div className="search-bar">
          <SearchOutlined style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)', fontSize: 16, zIndex: 1 }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            autoFocus
            style={{ paddingLeft: 36 }}
          />
          {loading && (
            <div className="search-spinner">
              <Spin size="small" />
            </div>
          )}
        </div>

        {searched && !loading && total > 0 && (
          <p className="search-count">
            {total} memorial{total !== 1 ? 's' : ''} found
          </p>
        )}

        {searched && !loading && results.length === 0 && (
          <EmptyState
            title="No memorials found"
            description={`No public memorials match "${debouncedQuery}". Try a different name.`}
          />
        )}

        {results.length > 0 && (
          <>
            <div className="search-results">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="search-result-card"
                  onClick={() => navigate(`/memorials/${r.id}`)}
                >
                  <Avatar
                    src={r.profilePhotoUrl ?? undefined}
                    name={r.fullName}
                    size="lg"
                  />
                  <div className="search-result-info">
                    <h3>{r.fullName}</h3>
                    <p className="search-result-dates">
                      {r.dateOfBirth
                        ? format(new Date(r.dateOfBirth), 'MMM d, yyyy')
                        : ''}
                      {r.dateOfBirth && r.dateOfPassing ? ' — ' : ''}
                      {r.dateOfPassing
                        ? format(new Date(r.dateOfPassing), 'MMM d, yyyy')
                        : ''}
                    </p>
                    {r.biography && (
                      <p className="search-result-bio">
                        {r.biography.length > 120
                          ? r.biography.slice(0, 120) + '…'
                          : r.biography}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="search-pagination">
                <Pagination
                  current={page}
                  total={total}
                  pageSize={10}
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
