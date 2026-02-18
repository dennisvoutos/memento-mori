import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpPage } from './HelpPage';

describe('HelpPage', () => {
  it('renders main heading', () => {
    render(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Help Center')).toBeInTheDocument();
  });

  it('renders getting started section', () => {
    render(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
  });

  it('renders FAQ questions', () => {
    render(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>
    );
    expect(screen.getByText('What is Memento Mori?')).toBeInTheDocument();
    expect(screen.getByText('Is it free to create a memorial?')).toBeInTheDocument();
  });

  it('renders still need help section', () => {
    render(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/still need help/i)).toBeInTheDocument();
  });
});
