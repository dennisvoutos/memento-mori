import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditMemorialPage } from './EditMemorialPage';
import { useMemorialStore } from '../../stores/memorialStore';

vi.mock('../../stores/memorialStore', () => ({
  useMemorialStore: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  api: {
    lifeMoments: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), delete: vi.fn() },
    memorials: { uploadPhoto: vi.fn(), generateShareLink: vi.fn().mockResolvedValue({ accessToken: 'tok123' }) },
  },
}));

const mockUseMemorialStore = useMemorialStore as unknown as ReturnType<typeof vi.fn>;

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

const memorial = {
  id: 'mem-1',
  fullName: 'Jane Doe',
  dateOfBirth: '1980-01-15T00:00:00Z',
  dateOfPassing: '2023-06-01T00:00:00Z',
  biography: 'A wonderful person.',
  privacyLevel: 'PRIVATE',
  userId: 'user-1',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/memorials/mem-1/edit']}>
      <Routes>
        <Route path="/memorials/:id/edit" element={<EditMemorialPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EditMemorialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while loading', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: true,
      error: null,
      fetchMemorial: vi.fn(),
      updateMemorial: vi.fn(),
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderPage();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('shows error state when memorial not found', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: false,
      error: 'Not found',
      fetchMemorial: vi.fn(),
      updateMemorial: vi.fn(),
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Memorial not found')).toBeInTheDocument();
  });

  it('renders edit form when memorial is loaded', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: memorial,
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      updateMemorial: vi.fn(),
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Edit Memorial')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
  });

  it('renders View Page button', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: memorial,
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      updateMemorial: vi.fn(),
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole('button', { name: /view page/i })).toBeInTheDocument();
  });

  it('renders section headings', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: memorial,
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      updateMemorial: vi.fn(),
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Profile Photo')).toBeInTheDocument();
    expect(screen.getByText('Life Moments')).toBeInTheDocument();
    expect(screen.getByText('Share Link')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('calls fetchMemorial on mount', () => {
    const fetchFn = vi.fn();
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: true,
      error: null,
      fetchMemorial: fetchFn,
      updateMemorial: vi.fn(),
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderPage();
    expect(fetchFn).toHaveBeenCalledWith('mem-1');
  });

  it('calls updateMemorial when Save Changes is clicked', async () => {
    const updateFn = vi.fn().mockResolvedValue(undefined);
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: memorial,
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      updateMemorial: updateFn,
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(updateFn).toHaveBeenCalled();
  });

  it('renders Delete Memorial button in danger zone', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: memorial,
      isLoading: false,
      error: null,
      fetchMemorial: vi.fn(),
      updateMemorial: vi.fn(),
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole('button', { name: /delete memorial/i })).toBeInTheDocument();
  });

  it('navigates to dashboard on error action', async () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: false,
      error: 'Oops',
      fetchMemorial: vi.fn(),
      updateMemorial: vi.fn(),
      deleteMemorial: vi.fn(),
      clearCurrent: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
