import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreateMemorialPage } from './CreateMemorialPage';
import { useMemorialStore } from '../../stores/memorialStore';

vi.mock('../../stores/memorialStore', () => ({
  useMemorialStore: vi.fn(),
}));

vi.mock('@memento-mori/shared', async () => {
  const actual = await vi.importActual('@memento-mori/shared');
  return {
    ...actual,
    createMemorialSchema: { parse: (v: any) => v },
  };
});

const mockUseMemorialStore = useMemorialStore as unknown as ReturnType<typeof vi.fn>;

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

describe('CreateMemorialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMemorialStore.mockReturnValue({
      createMemorial: vi.fn(),
      isLoading: false,
    });
  });

  it('renders the page title', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByText('Create a Memorial')).toBeInTheDocument();
  });

  it('renders the full name input', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('renders biography textarea', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByLabelText(/tell their story/i)).toBeInTheDocument();
  });

  it('renders privacy selector', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByText(/private/i)).toBeInTheDocument();
  });

  it('renders cancel and submit buttons', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create memorial/i })).toBeInTheDocument();
  });

  it('navigates to dashboard on cancel', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('calls createMemorial on valid form submit', async () => {
    const createFn = vi.fn().mockResolvedValue({ id: 'new-id' });
    mockUseMemorialStore.mockReturnValue({
      createMemorial: createFn,
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.click(screen.getByRole('button', { name: /create memorial/i }));

    expect(createFn).toHaveBeenCalled();
  });

  it('navigates to memorial page after creation', async () => {
    const createFn = vi.fn().mockResolvedValue({ id: 'new-memorial-id' });
    mockUseMemorialStore.mockReturnValue({
      createMemorial: createFn,
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.click(screen.getByRole('button', { name: /create memorial/i }));

    expect(mockedNavigate).toHaveBeenCalledWith('/memorials/new-memorial-id');
  });

  it('shows server error on creation failure', async () => {
    const createFn = vi.fn().mockRejectedValue(new Error('Server error'));
    mockUseMemorialStore.mockReturnValue({
      createMemorial: createFn,
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.click(screen.getByRole('button', { name: /create memorial/i }));

    expect(await screen.findByText('Server error')).toBeInTheDocument();
  });
});
