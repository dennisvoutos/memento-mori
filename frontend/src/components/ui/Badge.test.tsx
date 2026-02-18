import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Private</Badge>);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('applies default variant class', () => {
    const { container } = render(<Badge>Text</Badge>);
    expect(container.firstChild).toHaveClass('badge-default');
  });

  it('applies private variant class', () => {
    const { container } = render(<Badge variant="private">Private</Badge>);
    expect(container.firstChild).toHaveClass('badge-private');
  });

  it('applies shared variant class', () => {
    const { container } = render(<Badge variant="shared">Shared</Badge>);
    expect(container.firstChild).toHaveClass('badge-shared');
  });

  it('applies public variant class', () => {
    const { container } = render(<Badge variant="public">Public</Badge>);
    expect(container.firstChild).toHaveClass('badge-public');
  });
});
