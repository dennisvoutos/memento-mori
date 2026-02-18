import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timeline } from './Timeline';

describe('Timeline', () => {
  const items = [
    { id: '1', title: 'Born', date: '1990-01-01', description: 'First day' },
    { id: '2', title: 'Graduated', date: '2012-06-15', description: null },
    { id: '3', title: 'Married', date: '2015-09-20' },
  ];

  it('renders all timeline items', () => {
    render(<Timeline items={items} />);
    expect(screen.getByText('Born')).toBeInTheDocument();
    expect(screen.getByText('Graduated')).toBeInTheDocument();
    expect(screen.getByText('Married')).toBeInTheDocument();
  });

  it('renders dates', () => {
    render(<Timeline items={items} />);
    expect(screen.getByText('1990-01-01')).toBeInTheDocument();
    expect(screen.getByText('2012-06-15')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<Timeline items={items} />);
    expect(screen.getByText('First day')).toBeInTheDocument();
  });

  it('does not render description when null', () => {
    render(<Timeline items={[{ id: '1', title: 'Event', date: '2020-01-01', description: null }]} />);
    const descs = document.querySelectorAll('.timeline-desc');
    expect(descs.length).toBe(0);
  });

  it('returns null when items is empty', () => {
    const { container } = render(<Timeline items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders connector between items but not after last', () => {
    const { container } = render(<Timeline items={items} />);
    const connectors = container.querySelectorAll('.timeline-connector');
    // Should have n-1 connectors
    expect(connectors.length).toBe(2);
  });
});
