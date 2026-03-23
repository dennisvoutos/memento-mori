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

vi.mock('../../services/api', () => ({
  api: { memorials: { uploadPhoto: vi.fn().mockResolvedValue({}) } },
}));

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

  it('renders step 1 with full name input', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('renders stepper with all steps', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Story')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });

  it('renders Next button on step 1', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('renders Discard & Return to Dashboard link', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByText(/discard & return to dashboard/i)).toBeInTheDocument();
  });

  it('navigates to dashboard on Discard & Return to Dashboard', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    await user.click(screen.getByText(/discard & return to dashboard/i));
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows validation errors when Next is clicked with empty fields', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
  });

  it('renders upload zone for photo on step 1', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByText('Upload Primary Portrait')).toBeInTheDocument();
  });

  it('renders obituary textarea on step 1', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByLabelText(/obituary/i)).toBeInTheDocument();
  });
});
