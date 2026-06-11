import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';
import { useAuthStore } from '../../stores/authStore';

vi.mock('@ant-design/icons', () => ({
  HomeOutlined: () => <span aria-hidden="true" />,
  SearchOutlined: () => <span aria-hidden="true" />,
  AppstoreOutlined: () => <span aria-hidden="true" />,
  UserOutlined: () => <span aria-hidden="true" />,
  LogoutOutlined: () => <span aria-hidden="true" />,
  LoginOutlined: () => <span aria-hidden="true" />,
}));

vi.mock('../../lib/notifications', () => ({
  useAppNotifications: () => ({
    logout: vi.fn(),
  }),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logo', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      hasPendingVerification: false,
      pendingVerificationEmail: null,
      user: null,
      logout: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByRole('img', { name: /memento mori/i })).toBeInTheDocument();
    expect(screen.getByText(/my memento/i)).toBeInTheDocument();
    expect(screen.getByText(/mori/i)).toBeInTheDocument();
  });

  it('shows Home and Search links', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      hasPendingVerification: false,
      pendingVerificationEmail: null,
      user: null,
      logout: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText(/home/i)).toBeInTheDocument();
    expect(screen.getByText(/search/i)).toBeInTheDocument();
  });

  it('shows Sign In and Get Started when not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      hasPendingVerification: false,
      pendingVerificationEmail: null,
      user: null,
      logout: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    expect(screen.getByText(/get started/i)).toBeInTheDocument();
  });

  it('shows user name and My Memorials when authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      hasPendingVerification: false,
      pendingVerificationEmail: null,
      user: { displayName: 'John Doe' },
      logout: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/my memorials/i)).toBeInTheDocument();
  });

  it('shows Sign Out button when authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      hasPendingVerification: false,
      pendingVerificationEmail: null,
      user: { displayName: 'Jane' },
      logout: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
  });

  it('calls logout when Sign Out is clicked', async () => {
    const user = userEvent.setup();
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      hasPendingVerification: false,
      pendingVerificationEmail: null,
      user: { displayName: 'Jane' },
      logout: mockLogout,
    });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    await user.click(screen.getByText(/sign out/i));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('shows a verify email action for pending users', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      hasPendingVerification: true,
      pendingVerificationEmail: 'pending@test.com',
      user: { displayName: 'Pending User', email: 'pending@test.com' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText(/verify email/i)).toBeInTheDocument();
    expect(screen.queryByText(/get started/i)).not.toBeInTheDocument();
  });
});
