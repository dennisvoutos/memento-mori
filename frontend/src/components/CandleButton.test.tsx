import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandleButton } from './CandleButton';

describe('CandleButton', () => {
  it('renders with initial count', () => {
    render(<CandleButton count={5} onLight={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows "Light a Candle" text initially', () => {
    render(<CandleButton count={0} onLight={vi.fn()} />);
    expect(screen.getByText('Light a Candle')).toBeInTheDocument();
  });

  it('calls onLight and shows lit state after click', async () => {
    const user = userEvent.setup();
    const onLight = vi.fn().mockResolvedValue(undefined);
    render(<CandleButton count={3} onLight={onLight} />);

    await user.click(screen.getByRole('button'));
    expect(onLight).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Candle Lit')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('disables button after lit', async () => {
    const user = userEvent.setup();
    const onLight = vi.fn().mockResolvedValue(undefined);
    render(<CandleButton count={0} onLight={onLight} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onLight if already lit', async () => {
    const user = userEvent.setup();
    const onLight = vi.fn().mockResolvedValue(undefined);
    render(<CandleButton count={0} onLight={onLight} />);

    await user.click(screen.getByRole('button'));
    onLight.mockClear();
    // Button is disabled now, so click won't fire
    await user.click(screen.getByRole('button')).catch(() => {});
    expect(onLight).not.toHaveBeenCalled();
  });

  it('handles onLight failure gracefully', async () => {
    const user = userEvent.setup();
    const onLight = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<CandleButton count={2} onLight={onLight} />);

    await user.click(screen.getByRole('button'));
    // Should not be in lit state after failure
    expect(screen.getByText('Light a Candle')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
