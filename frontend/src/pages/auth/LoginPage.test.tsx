import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '../../stores/authStore';
import { ApiClientError } from '../../services/api';

vi.mock('./GoogleAuthButton', () => ({
  GoogleAuthButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      login: vi.fn(),
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
  });

  it('renders login form', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a Google sign-in button', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /log in with google/i })).toBeInTheDocument();
  });

  it('has a link to register page', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/register');
  });

  it('redirects to dashboard if already authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: true,
      login: vi.fn(),
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.queryByText('Welcome Back')).not.toBeInTheDocument();
  });

  it('calls login on form submit', async () => {
    const loginFn = vi.fn().mockResolvedValue(undefined);
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      login: loginFn,
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(loginFn).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('shows server error on login failure', async () => {
    const loginFn = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      login: loginFn,
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows Google OAuth errors from the callback query string', () => {
    render(
      <MemoryRouter initialEntries={['/login?authError=google_access_denied']}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText('Google sign-in was cancelled before it could be completed.')
    ).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Zod will produce validation errors — login should NOT be called
    const loginFn = mockUseAuthStore.mock.results[0].value.login;
    expect(loginFn).not.toHaveBeenCalled();
  });

  it('shows a verification help link for unverified login failures', async () => {
    const loginFn = vi.fn().mockRejectedValue(
      new ApiClientError(
        403,
        'Account not verified. Check your email or request a new link.'
      )
    );

    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      login: loginFn,
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });

    const user = userEvent.setup();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/email/i), 'pending@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByRole('link', { name: /open verification help/i })
    ).toHaveAttribute('href', '/pending-verification?email=pending%40test.com');
  });
});
