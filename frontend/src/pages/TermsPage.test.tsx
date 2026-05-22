import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TermsPage } from './TermsPage';

describe('TermsPage', () => {
  it('renders only the terms of service document', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument();
  });

  it('renders the updated terms content', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/these terms are governed by the laws of quebec, canada/i)).toBeInTheDocument();
  });
});
