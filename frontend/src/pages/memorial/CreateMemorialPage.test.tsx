import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';

const {
  uploadPhotoMock,
  uploadGalleryPhotoMock,
  messageMock,
  mockedNavigate,
} = vi.hoisted(() => ({
  uploadPhotoMock: vi.fn().mockResolvedValue({}),
  uploadGalleryPhotoMock: vi.fn().mockResolvedValue({}),
  messageMock: {
    error: vi.fn(),
    warning: vi.fn(),
  },
  mockedNavigate: vi.fn(),
}));

vi.mock('antd', async () => {
  const React = await import('react');
  const h = React.createElement;

  const DatePicker = (props: any) =>
    h('input', {
      placeholder: props.placeholder,
      value: props.value?.format?.('YYYY-MM-DD') ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = e.target.value;
        props.onChange?.(
          nextValue
            ? { format: () => nextValue }
            : null,
          nextValue,
        );
      },
    });

  const Select = (props: any) =>
    h(
      'select',
      {
        value: props.value ?? '',
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => props.onChange?.(e.target.value),
      },
      (props.options ?? []).map((option: any) =>
        h('option', { key: option.value, value: option.value }, option.label)
      )
    );

  const Switch = (props: any) =>
    h('input', {
      type: 'checkbox',
      checked: Boolean(props.checked),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange?.(e.target.checked),
      'aria-labelledby': props['aria-labelledby'],
    });

  return {
    DatePicker,
    Select,
    Switch,
    message: messageMock,
  };
});

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
  api: {
    memorials: { uploadPhoto: uploadPhotoMock },
    memorialImages: { upload: uploadGalleryPhotoMock },
  },
}));

import { CreateMemorialPage } from './CreateMemorialPage';

const mockUseMemorialStore = useMemorialStore as unknown as ReturnType<typeof vi.fn>;
const createMemorialMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

async function advanceToPhotoStep(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByPlaceholderText('e.g. Margaret Anne Ellis'), {
    target: { value: 'Margaret Anne Ellis' },
  });

  const [birthDateInput, passingDateInput] = screen.getAllByPlaceholderText('Select date');
  fireEvent.change(birthDateInput, { target: { value: '1950-01-10' } });
  fireEvent.change(passingDateInput, { target: { value: '2024-03-11' } });

  await user.click(screen.getByRole('button', { name: /^next$/i }));
  await user.click(screen.getByRole('button', { name: /^next$/i }));
}

describe('CreateMemorialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });
    createMemorialMock.mockResolvedValue({ id: 'memorial-123' });
    mockUseMemorialStore.mockReturnValue({
      createMemorial: createMemorialMock,
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

  it('renders the step 1 profile photo picker and keeps the full photo manager on step 3', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /add profile photo/i })).toBeInTheDocument();
    expect(screen.getByTestId('create-memorial-primary-photo-input')).toBeInTheDocument();
    expect(screen.queryByText(/drop photos here or click to browse/i)).not.toBeInTheDocument();

    await advanceToPhotoStep(user);

    expect(screen.getByText(/drop photos here or click to browse/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add photos/i })).toBeInTheDocument();
  });

  it('renders obituary textarea on step 1', () => {
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);
    expect(screen.getByLabelText(/obituary/i)).toBeInTheDocument();
  });

  it('lets the user add, replace, and delete draft photos before creating the memorial', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);

    await advanceToPhotoStep(user);

    const addPhotoInput = screen.getByTestId('create-memorial-photo-input') as HTMLInputElement;
    const replacePhotoInput = screen.getByTestId('create-memorial-replace-photo-input') as HTMLInputElement;
    const firstPhoto = new File(['first'], 'first.png', { type: 'image/png' });
    const secondPhoto = new File(['second'], 'second.png', { type: 'image/png' });
    const replacementPhoto = new File(['replacement'], 'updated.png', { type: 'image/png' });

    await user.upload(addPhotoInput, [firstPhoto, secondPhoto]);

    expect(screen.getByText('first.png')).toBeInTheDocument();
    expect(screen.getByText('second.png')).toBeInTheDocument();
    expect(screen.getByText('Profile photo')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /^replace$/i })[1]);
    await user.upload(replacePhotoInput, replacementPhoto);

    expect(screen.getByText('updated.png')).toBeInTheDocument();
    expect(screen.queryByText('second.png')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /^delete$/i })[1]);

    expect(screen.queryByText('updated.png')).not.toBeInTheDocument();
    expect(screen.getByText('first.png')).toBeInTheDocument();
  });

  it('uploads the profile photo and additional gallery photos after creating the memorial', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CreateMemorialPage /></MemoryRouter>);

    const primaryPhotoInput = screen.getByTestId('create-memorial-primary-photo-input') as HTMLInputElement;
    const firstPhoto = new File(['first'], 'first.png', { type: 'image/png' });
    const secondPhoto = new File(['second'], 'second.png', { type: 'image/png' });

    await user.upload(primaryPhotoInput, firstPhoto);

    expect(screen.getByText(/first\.png is currently selected as the profile photo\./i)).toBeInTheDocument();

    await advanceToPhotoStep(user);

    const addPhotoInput = screen.getByTestId('create-memorial-photo-input') as HTMLInputElement;
    await user.upload(addPhotoInput, [firstPhoto, secondPhoto]);
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /create memorial/i }));

    await waitFor(() => {
      expect(createMemorialMock).toHaveBeenCalled();
      expect(uploadPhotoMock).toHaveBeenCalledWith('memorial-123', firstPhoto);
      expect(uploadGalleryPhotoMock).toHaveBeenCalledWith('memorial-123', firstPhoto);
      expect(uploadGalleryPhotoMock).toHaveBeenCalledWith('memorial-123', secondPhoto);
      expect(mockedNavigate).toHaveBeenCalledWith('/memorials/memorial-123');
    });
  });
});
