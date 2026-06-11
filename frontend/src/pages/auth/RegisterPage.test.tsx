import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { useAuthStore } from '../../stores/authStore';

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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      register: vi.fn(),
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
  });

  const createRegisteredUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    email: 'john@outlook.com',
    displayName: 'John Doe',
    profilePhotoUrl: null,
    emailVerified: false,
    hasPassword: true,
    isGoogleConnected: false,
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
    ...overrides,
  });

  it('renders registration form', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders password fields', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('renders create account button', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders a Google sign-up button', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
  });

  it('has a link to login page', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('redirects to dashboard if already authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: true,
      register: vi.fn(),
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.queryByText('Create Your Account')).not.toBeInTheDocument();
  });

  it('calls register on valid form submit', async () => {
    const registerFn = vi.fn().mockResolvedValue(createRegisteredUser());
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      register: registerFn,
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/display name/i), 'John Doe');
  await user.type(screen.getByLabelText(/email/i), 'john@outlook.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(
      screen.getByLabelText(/i accept the privacy policy and terms of service/i)
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(registerFn).toHaveBeenCalledWith(
      'John Doe',
      'john@outlook.com',
      'Password123!',
      true
    );
    expect(mockedNavigate).toHaveBeenCalledWith(
      '/pending-verification?email=john%40outlook.com',
      { replace: true }
    );
  });

  it('redirects verified signups to the requested page instead of pending verification', async () => {
    const registerFn = vi.fn().mockResolvedValue(
      createRegisteredUser({ email: 'john@gmail.com', emailVerified: true })
    );

    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      register: registerFn,
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/register?redirectTo=%2Fdashboard%3Ftab%3Daccount']}>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/display name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@gmail.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(
      screen.getByLabelText(/i accept the privacy policy and terms of service/i)
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard?tab=account', {
      replace: true,
    });
  });

  it('shows server error on registration failure', async () => {
    const registerFn = vi.fn().mockRejectedValue(new Error('Email already taken'));
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      register: registerFn,
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/display name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@gmail.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(
      screen.getByLabelText(/i accept the privacy policy and terms of service/i)
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Email already taken')).toBeInTheDocument();
  });

  it('renders links to the privacy policy and terms of service', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    expect(
      screen.getByRole('link', { name: /privacy policy/i })
    ).toHaveAttribute('href', '/privacy');
    expect(
      screen.getByRole('link', { name: /terms of service/i })
    ).toHaveAttribute('href', '/terms');
  });

  it('shows a warning for unsupported email providers before submit', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/email/i), 'john@example.com');

    expect(
      screen.getByText(/this email provider is not supported yet/i)
    ).toBeInTheDocument();
  });

  it('blocks registration when the email provider is out of scope', async () => {
    const registerFn = vi.fn();
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      register: registerFn,
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/display name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(registerFn).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/this email provider is not supported yet/i)
    ).toBeInTheDocument();
  });

  it('blocks registration when the policies are not accepted', async () => {
    const registerFn = vi.fn();
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      isAuthenticated: false,
      register: registerFn,
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
      pendingVerificationEmail: null,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/display name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@gmail.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(registerFn).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/you must accept the privacy policy and terms of service/i)
    ).toBeInTheDocument();
  });

  it('preserves redirectTo when switching back to login', () => {
    render(
      <MemoryRouter initialEntries={['/register?redirectTo=%2Fmemorials%2Fnew']}>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?redirectTo=%2Fmemorials%2Fnew'
    );
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    const registerFn = mockUseAuthStore.mock.results[0].value.register;
    expect(registerFn).not.toHaveBeenCalled();
  });

  it('redirects pending users to the pending verification page', () => {
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: true,
      isAuthenticated: false,
      pendingVerificationEmail: 'pending@test.com',
      register: vi.fn(),
      loginWithGoogleCredential: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.queryByText('Create Your Account')).not.toBeInTheDocument();
  });
});
