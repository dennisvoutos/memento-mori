import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryCard } from './MemoryCard';

describe('MemoryCard', () => {
  const baseProps = {
    type: 'TEXT',
    createdAt: '2025-06-15T10:00:00Z',
  };

  it('renders text content', () => {
    render(<MemoryCard {...baseProps} content="A wonderful memory" />);
    expect(screen.getByText('A wonderful memory')).toBeInTheDocument();
  });

  it('renders photo when type is PHOTO', () => {
    render(
      <MemoryCard
        {...baseProps}
        type="PHOTO"
        mediaUrl="https://example.com/photo.jpg"
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('renders quote when type is QUOTE', () => {
    render(<MemoryCard {...baseProps} type="QUOTE" content="Remember always" />);
    expect(screen.getByText('"Remember always"')).toBeInTheDocument();
  });

  it('renders tribute badge when type is TRIBUTE', () => {
    render(<MemoryCard {...baseProps} type="TRIBUTE" content="We miss you" />);
    expect(screen.getByText('Tribute')).toBeInTheDocument();
    expect(screen.getByText('We miss you')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<MemoryCard {...baseProps} />);
    expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument();
  });

  it('renders author name when provided', () => {
    render(<MemoryCard {...baseProps} authorName="John Doe" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows delete button when canDelete is true', () => {
    render(<MemoryCard {...baseProps} canDelete onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('does not show delete button when canDelete is false', () => {
    render(<MemoryCard {...baseProps} canDelete={false} />);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<MemoryCard {...baseProps} canDelete onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('applies type-specific CSS class', () => {
    const { container } = render(<MemoryCard {...baseProps} type="PHOTO" />);
    expect(container.firstChild).toHaveClass('memory-photo');
  });
});
