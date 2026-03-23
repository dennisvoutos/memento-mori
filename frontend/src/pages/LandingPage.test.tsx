import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: {
    search: {
      memorials: vi.fn(),
    },
  },
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockSearch = api.search.memorials as ReturnType<typeof vi.fn>;

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ isAuthenticated: false });
    mockSearch.mockResolvedValue({ items: [], total: 0 });
  });

  it('renders hero section', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/honoring every story/i)).toBeInTheDocument();
  });

  it('renders create button', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/create a memorial/i)).toBeInTheDocument();
  });

  it('renders featured categories', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Featured Categories')).toBeInTheDocument();
    expect(screen.getByText('Heart Disease')).toBeInTheDocument();
    expect(screen.getByText('Cancer')).toBeInTheDocument();
    expect(screen.getByText('Accident')).toBeInTheDocument();
  });

  it('renders bottom CTA', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/their story deserves/i)).toBeInTheDocument();
  });

  it('renders search form', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/search for a memorial/i)).toBeInTheDocument();
  });

  it('shows recent memorials section', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/recent memorials/i)).toBeInTheDocument();
  });
});
