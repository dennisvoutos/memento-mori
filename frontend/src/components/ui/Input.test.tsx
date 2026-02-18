import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, Textarea } from './Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders without label', () => {
    const { container } = render(<Input placeholder="Enter text" />);
    expect(container.querySelector('.input-label')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Name" error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('sets aria-invalid when error exists', () => {
    render(<Input label="Name" error="Required" />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows helper text when no error', () => {
    render(<Input label="Name" helperText="Enter your name" />);
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('does not show helper text when error is present', () => {
    render(<Input label="Name" error="Required" helperText="Enter your name" />);
    expect(screen.queryByText('Enter your name')).not.toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    await user.type(screen.getByLabelText('Name'), 'John');
    expect(onChange).toHaveBeenCalled();
  });

  it('generates id from label', () => {
    render(<Input label="Full Name" />);
    expect(screen.getByLabelText('Full Name')).toHaveAttribute('id', 'full-name');
  });

  it('uses provided id over generated one', () => {
    render(<Input label="Email" id="custom-id" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'custom-id');
  });

  it('applies error class to container', () => {
    const { container } = render(<Input label="Name" error="Required" />);
    expect(container.firstChild).toHaveClass('input-error');
  });
});

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Message" />);
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('renders as a textarea element', () => {
    render(<Textarea label="Bio" />);
    const el = screen.getByLabelText('Bio');
    expect(el.tagName).toBe('TEXTAREA');
  });

  it('shows error message', () => {
    render(<Textarea label="Message" error="Too short" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });

  it('shows helper text when no error', () => {
    render(<Textarea label="Bio" helperText="Max 500 chars" />);
    expect(screen.getByText('Max 500 chars')).toBeInTheDocument();
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea label="Message" onChange={onChange} />);
    await user.type(screen.getByLabelText('Message'), 'Hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('sets rows attribute', () => {
    render(<Textarea label="Text" rows={5} />);
    expect(screen.getByLabelText('Text')).toHaveAttribute('rows', '5');
  });
});
