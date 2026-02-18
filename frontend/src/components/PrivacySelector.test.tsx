import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacySelector } from './PrivacySelector';

describe('PrivacySelector', () => {
  it('renders all three options', () => {
    render(<PrivacySelector value="PRIVATE" onChange={vi.fn()} />);
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Shared Link')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('renders descriptions', () => {
    render(<PrivacySelector value="PRIVATE" onChange={vi.fn()} />);
    expect(screen.getByText(/only invited people/i)).toBeInTheDocument();
    expect(screen.getByText(/anyone with the link/i)).toBeInTheDocument();
    expect(screen.getByText(/anyone can find/i)).toBeInTheDocument();
  });

  it('selects the correct radio for current value', () => {
    render(<PrivacySelector value="PUBLIC" onChange={vi.fn()} />);
    const radios = document.querySelectorAll('input[type="radio"]');
    expect(radios[0]).not.toBeChecked(); // PRIVATE
    expect(radios[1]).not.toBeChecked(); // SHARED_LINK
    expect(radios[2]).toBeChecked(); // PUBLIC
  });

  it('calls onChange with selected value', () => {
    const onChange = vi.fn();
    render(<PrivacySelector value="PRIVATE" onChange={onChange} />);

    const radios = document.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[1]); // SHARED_LINK
    expect(onChange).toHaveBeenCalledWith('SHARED_LINK');
  });

  it('highlights selected option', () => {
    render(<PrivacySelector value="SHARED_LINK" onChange={vi.fn()} />);
    const labels = document.querySelectorAll('.privacy-option');
    expect(labels[1]).toHaveClass('selected');
    expect(labels[0]).not.toHaveClass('selected');
  });

  it('renders privacy level label', () => {
    render(<PrivacySelector value="PRIVATE" onChange={vi.fn()} />);
    expect(screen.getByText('Privacy Level')).toBeInTheDocument();
  });
});
