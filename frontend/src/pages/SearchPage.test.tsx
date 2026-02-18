import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchPage } from './SearchPage';

// Mock the API
vi.mock('../services/api', () => ({
  api: {
    search: {
      memorials: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 0 }),
    },
  },
}));

// Mock useDebounce to return the value immediately
vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search heading', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Search Memorials')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/find public memorials/i)).toBeInTheDocument();
  });
});
