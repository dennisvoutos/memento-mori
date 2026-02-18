import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SharedMemorialPage } from './SharedMemorialPage';
import { useMemorialStore } from '../../stores/memorialStore';

vi.mock('../../stores/memorialStore', () => ({
  useMemorialStore: vi.fn(),
}));

const mockUseMemorialStore = useMemorialStore as unknown as ReturnType<typeof vi.fn>;

describe('SharedMemorialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while resolving token', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: true,
      error: null,
      fetchMemorialByToken: vi.fn(),
      clearCurrent: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/memorials/shared/abc']}>
        <Routes>
          <Route path="/memorials/shared/:token" element={<SharedMemorialPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('shows error for invalid token', () => {
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: false,
      error: 'Invalid token',
      fetchMemorialByToken: vi.fn(),
      clearCurrent: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/memorials/shared/bad']}>
        <Routes>
          <Route path="/memorials/shared/:token" element={<SharedMemorialPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/link expired or invalid/i)).toBeInTheDocument();
  });

  it('calls fetchMemorialByToken on mount', () => {
    const fetchFn = vi.fn();
    mockUseMemorialStore.mockReturnValue({
      currentMemorial: null,
      isLoading: true,
      error: null,
      fetchMemorialByToken: fetchFn,
      clearCurrent: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/memorials/shared/xyz']}>
        <Routes>
          <Route path="/memorials/shared/:token" element={<SharedMemorialPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(fetchFn).toHaveBeenCalledWith('xyz');
  });
});
