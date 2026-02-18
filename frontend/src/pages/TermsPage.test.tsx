import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TermsPage } from './TermsPage';

describe('TermsPage', () => {
  it('renders heading', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  it('renders terms content', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );
    // Check that some sections exist
    const body = document.querySelector('.terms-page');
    expect(body).toBeInTheDocument();
    expect(body?.textContent?.length).toBeGreaterThan(100);
  });
});
