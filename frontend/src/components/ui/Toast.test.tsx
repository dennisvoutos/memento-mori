import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastContainer, toast } from './Toast';

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders empty initially', () => {
    const { container } = render(<ToastContainer />);
    expect(container.querySelector('.toast')).not.toBeInTheDocument();
  });

  it('shows toast when toast() is called', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Hello world');
    });
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('applies correct type class for success', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Success!', 'success');
    });
    expect(screen.getByText('Success!')).toHaveClass('toast-success');
  });

  it('applies correct type class for error', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Error!', 'error');
    });
    expect(screen.getByText('Error!')).toHaveClass('toast-error');
  });

  it('defaults to info type', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Info message');
    });
    expect(screen.getByText('Info message')).toHaveClass('toast-info');
  });

  it('removes toast after timeout', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Temporary');
    });
    expect(screen.getByText('Temporary')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
  });

  it('shows multiple toasts', () => {
    render(<ToastContainer />);
    act(() => {
      toast('First');
      toast('Second');
    });
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
