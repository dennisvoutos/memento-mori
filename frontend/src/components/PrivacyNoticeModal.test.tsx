import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyNoticeModal } from './PrivacyNoticeModal';

describe('PrivacyNoticeModal', () => {
  it('renders content when open', () => {
    render(<PrivacyNoticeModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Privacy Notice')).toBeInTheDocument();
  });

  it('renders all privacy sections', () => {
    render(<PrivacyNoticeModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Data We Collect')).toBeInTheDocument();
    expect(screen.getByText('How We Use Your Data')).toBeInTheDocument();
    expect(screen.getByText('Data Sharing')).toBeInTheDocument();
    expect(screen.getByText('Data Security')).toBeInTheDocument();
    expect(screen.getByText('Your Rights')).toBeInTheDocument();
    expect(screen.getByText('Cookies')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders last updated date', () => {
    render(<PrivacyNoticeModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });
});
