import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemorialPage } from './MemorialPage';
import { useMemorialStore } from '../../stores/memorialStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

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
const mockApi = api as unknown as {
  memories: { list: ReturnType<typeof vi.fn> };
  interactions: { create: ReturnType<typeof vi.fn> };
};

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
    mockApi.memories.list.mockResolvedValue({ items: [] });
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

  it('shows Share a Memory button', () => {
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
    expect(screen.getByText(/share a memory/i)).toBeInTheDocument();
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
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Gallery')).toBeInTheDocument();
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

  it('shows Add Photo for a logged-in viewer when uploads are enabled', async () => {
    const user = userEvent.setup();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'viewer-1' },
    });
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: {
        id: 'test-id',
        fullName: 'John Doe',
        ownerId: 'owner-1',
        profilePhotoUrl: null,
        privacyLevel: 'PUBLIC',
        canUploadPhotos: true,
      },
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();

    await user.click(screen.getByRole('tab', { name: /gallery/i }));

    expect(await screen.findByRole('button', { name: /add photo/i })).toBeInTheDocument();
  });

  it('shows owner moderation controls in the gallery', async () => {
    const user = userEvent.setup();
    mockApi.memories.list.mockResolvedValue({
      items: [
        {
          id: 'photo-1',
          memorialId: 'test-id',
          authorId: 'visitor-2',
          type: 'PHOTO',
          content: 'At the beach',
          mediaUrl: 'https://example.com/photo.jpg',
          caption: 'Summer memory',
          createdAt: '2025-06-15T10:00:00Z',
          author: { id: 'visitor-2', displayName: 'Visitor Two' },
        },
      ],
    });
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'owner-1' },
    });
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: {
        id: 'test-id',
        fullName: 'John Doe',
        ownerId: 'owner-1',
        profilePhotoUrl: null,
        privacyLevel: 'PUBLIC',
        canUploadPhotos: false,
      },
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderWithId();

    await user.click(screen.getByRole('tab', { name: /gallery/i }));

    expect(await screen.findByText(/owner moderation:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove photo/i })).toBeInTheDocument();
  });

  it('opens an auth prompt instead of lighting a candle for anonymous users', async () => {
    const user = userEvent.setup();
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: {
        id: 'test-id',
        fullName: 'John Doe',
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

    await user.click(screen.getByRole('button', { name: /light a candle/i }));

    expect(mockApi.interactions.create).not.toHaveBeenCalled();
    expect(await screen.findByText(/lighting a candle is reserved for signed-in visitors/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });
});
