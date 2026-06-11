import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PendingVerificationBanner } from './PendingVerificationBanner';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('PendingVerificationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: false,
      pendingVerificationEmail: null,
      user: null,
    });
  });

  it('renders nothing when verification is not pending', () => {
    render(
      <MemoryRouter>
        <PendingVerificationBanner />
      </MemoryRouter>
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders a top banner with a link to verification help', () => {
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: true,
      pendingVerificationEmail: 'pending@test.com',
      user: { email: 'pending@test.com' },
    });

    render(
      <MemoryRouter initialEntries={['/search']}>
        <PendingVerificationBanner />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.getByText(/your existing memorials remain safe/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open verification help/i })
    ).toHaveAttribute('href', '/pending-verification?email=pending%40test.com');
  });

  it('hides the banner on verification-specific routes', () => {
    mockUseAuthStore.mockReturnValue({
      hasPendingVerification: true,
      pendingVerificationEmail: 'pending@test.com',
      user: { email: 'pending@test.com' },
    });

    render(
      <MemoryRouter initialEntries={['/pending-verification']}>
        <PendingVerificationBanner />
      </MemoryRouter>
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});