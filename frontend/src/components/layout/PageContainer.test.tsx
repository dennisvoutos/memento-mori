import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageContainer } from './PageContainer';

// Mock Header and Footer to avoid complex dependency chains
vi.mock('./Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('./Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

describe('PageContainer', () => {
  it('renders children', () => {
    render(
      <MemoryRouter>
        <PageContainer>
          <div>Page content</div>
        </PageContainer>
      </MemoryRouter>
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders header by default', () => {
    render(
      <MemoryRouter>
        <PageContainer>Content</PageContainer>
      </MemoryRouter>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders footer by default', () => {
    render(
      <MemoryRouter>
        <PageContainer>Content</PageContainer>
      </MemoryRouter>
    );
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('hides header when showHeader is false', () => {
    render(
      <MemoryRouter>
        <PageContainer showHeader={false}>Content</PageContainer>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
  });

  it('hides footer when showFooter is false', () => {
    render(
      <MemoryRouter>
        <PageContainer showFooter={false}>Content</PageContainer>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
  });

  it('renders background element', () => {
    const { container } = render(
      <MemoryRouter>
        <PageContainer>Content</PageContainer>
      </MemoryRouter>
    );
    expect(container.querySelector('.page-background')).toBeInTheDocument();
  });
});
