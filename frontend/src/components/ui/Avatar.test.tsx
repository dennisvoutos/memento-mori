import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders image when src is provided', () => {
    render(<Avatar src="https://example.com/photo.jpg" name="John Doe" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(img).toHaveAttribute('alt', 'John Doe');
  });

  it('renders initials when no src', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders single initial for single name', () => {
    render(<Avatar name="John" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders with correct size class', () => {
    const { container } = render(<Avatar name="Jane" size="xl" />);
    expect(container.firstChild).toHaveClass('avatar-xl');
  });

  it('applies default md size', () => {
    const { container } = render(<Avatar name="Jane" />);
    expect(container.firstChild).toHaveClass('avatar-md');
  });

  it('applies custom className', () => {
    const { container } = render(<Avatar name="Jane" className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });

  it('does not render image when src is null', () => {
    render(<Avatar src={null} name="Jane" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});
