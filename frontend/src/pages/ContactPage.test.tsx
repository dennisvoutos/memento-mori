import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ContactPage } from './ContactPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    contact: {
      send: vi.fn(),
    },
  },
}));

const mockSend = api.contact.send as ReturnType<typeof vi.fn>;

describe('ContactPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders contact form', () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders subject and message fields', () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('has a submit button', () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('submits form successfully', async () => {
    const user = userEvent.setup();
    mockSend.mockResolvedValue({ message: 'Sent' });

    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/name/i), 'John');
    await user.type(screen.getByLabelText(/email/i), 'john@test.com');
    await user.type(screen.getByLabelText(/subject/i), 'Hello');
    await user.type(screen.getByLabelText(/message/i), 'Test message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(mockSend).toHaveBeenCalledWith({
      name: 'John',
      email: 'john@test.com',
      subject: 'Hello',
      message: 'Test message',
    });
  });
});
