import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from './Footer';

// Mock PrivacyNoticeModal
vi.mock('../PrivacyNoticeModal', () => ({
  PrivacyNoticeModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="privacy-modal">Privacy Modal</div> : null,
}));

describe('Footer', () => {
  it('renders all footer links', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByText(/home/i)).toBeInTheDocument();
    expect(screen.getByText(/about/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy/i)).toBeInTheDocument();
    expect(screen.getByText(/terms/i)).toBeInTheDocument();
    expect(screen.getByText(/help/i)).toBeInTheDocument();
    expect(screen.getByText(/contact/i)).toBeInTheDocument();
  });

  it('renders copyright text', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByText(/2026 memento mori/i)).toBeInTheDocument();
  });

  it('opens privacy modal when Privacy is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('privacy-modal')).not.toBeInTheDocument();
    await user.click(screen.getByText(/privacy/i));
    expect(screen.getByTestId('privacy-modal')).toBeInTheDocument();
  });
});
