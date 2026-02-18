import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemorialPage } from './MemorialPage';
import { useMemorialStore } from '../../stores/memorialStore';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../stores/memorialStore', () => ({
  useMemorialStore: vi.fn(),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  api: {
    lifeMoments: { list: vi.fn().mockResolvedValue([]) },
    memories: { list: vi.fn().mockResolvedValue({ items: [] }) },
    interactions: {
      list: vi.fn().mockResolvedValue({ items: [] }),
      stats: vi.fn().mockResolvedValue({ totalCandles: 0, totalMessages: 0 }),
      create: vi.fn(),
    },
  },
}));

const mockUseMemorialStore = useMemorialStore as unknown as ReturnType<typeof vi.fn>;
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

function renderWithId() {
  return render(
    <MemoryRouter initialEntries={['/memorials/test-id']}>
      <Routes>
        <Route path="/memorials/:id" element={<MemorialPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MemorialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
  });

  it('shows loading spinner when loading', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: true,
      error: null,
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('shows error when memorial not found', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: false,
      error: 'Not found',
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();
    expect(screen.getByText('Memorial not found')).toBeInTheDocument();
  });

  it('renders memorial name when loaded', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: {
        id: 'test-id',
        fullName: 'John Doe',
        ownerId: 'other-user',
        dateOfBirth: '1990-01-15',
        dateOfPassing: '2025-06-01',
        biography: 'A wonderful person',
        profilePhotoUrl: null,
        privacyLevel: 'PUBLIC',
      },
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders biography in story tab', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: {
        id: 'test-id',
        fullName: 'Jane Doe',
        ownerId: 'x',
        biography: 'She was amazing.',
        profilePhotoUrl: null,
        privacyLevel: 'PUBLIC',
      },
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();
    expect(screen.getByText('She was amazing.')).toBeInTheDocument();
  });

  it('shows Leave a Tribute button', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: {
        id: 'test-id',
        fullName: 'Test',
        ownerId: 'x',
        profilePhotoUrl: null,
        privacyLevel: 'PUBLIC',
      },
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();
    expect(screen.getByText(/leave a tribute/i)).toBeInTheDocument();
  });

  it('shows Edit button when user is owner', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'owner-1' },
    });
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: {
        id: 'test-id',
        fullName: 'Test',
        ownerId: 'owner-1',
        profilePhotoUrl: null,
        privacyLevel: 'PUBLIC',
      },
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();
    const editButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.trim().match(/^(edit\s*)?edit$/i)
    );
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('shows tabs', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: {
        id: 'test-id',
        fullName: 'Test',
        ownerId: 'x',
        profilePhotoUrl: null,
        privacyLevel: 'PUBLIC',
      },
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();
    expect(screen.getByText('Story')).toBeInTheDocument();
    expect(screen.getByText('Memories')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Tributes')).toBeInTheDocument();
  });

  it('calls fetchMemorial on mount', () => {
    const fetchFn = vi.fn();
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: true,
      error: null,
      fetchMemorial: fetchFn,
      clearCurrent: vi.fn(),
    });
    renderWithId();
    expect(fetchFn).toHaveBeenCalledWith('test-id');
  });
});
