import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { useMemorialStore } from '../../stores/memorialStore';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../stores/memorialStore', () => ({
  useMemorialStore: vi.fn(),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseMemorialStore = useMemorialStore as unknown as ReturnType<typeof vi.fn>;
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: { displayName: 'John Doe' },
    });
  });

  it('renders welcome message', () => {
    mockUseMemorialStore.mockReturnValue({
      memorials: [],
      isLoading: false,
      error: null,
      fetchMyMemorials: vi.fn(),
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/welcome back, john/i)).toBeInTheDocument();
  });

  it('shows loading spinner while loading', () => {
    mockUseMemorialStore.mockReturnValue({
      memorials: [],
      isLoading: true,
      error: null,
      fetchMyMemorials: vi.fn(),
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    // antd Spin renders a div with class ant-spin
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('shows empty state when no memorials', () => {
    mockUseMemorialStore.mockReturnValue({
      memorials: [],
      isLoading: false,
      error: null,
      fetchMyMemorials: vi.fn(),
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/no memorials yet/i)).toBeInTheDocument();
  });

  it('renders memorial cards when data exists', () => {
    mockUseMemorialStore.mockReturnValue({
      memorials: [
        {
          id: '1',
          fullName: 'Jane Doe',
          privacyLevel: 'PUBLIC',
          profilePhotoUrl: null,
          createdAt: '2025-01-01',
        },
      ],
      isLoading: false,
      error: null,
      fetchMyMemorials: vi.fn(),
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows error message on error', () => {
    mockUseMemorialStore.mockReturnValue({
      memorials: [],
      isLoading: false,
      error: 'Failed to load',
      fetchMyMemorials: vi.fn(),
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('has New Memorial button', () => {
    mockUseMemorialStore.mockReturnValue({
      memorials: [],
      isLoading: false,
      error: null,
      fetchMyMemorials: vi.fn(),
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/new memorial/i)).toBeInTheDocument();
  });

  it('calls fetchMyMemorials on mount', () => {
    const fetchFn = vi.fn();
    mockUseMemorialStore.mockReturnValue({
      memorials: [],
      isLoading: false,
      error: null,
      fetchMyMemorials: fetchFn,
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
