import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from './FileUpload';

describe('FileUpload', () => {
  it('renders label', () => {
    render(<FileUpload onFileSelect={vi.fn()} label="Profile Photo" />);
    expect(screen.getByText('Profile Photo')).toBeInTheDocument();
  });

  it('renders default label when not specified', () => {
    render(<FileUpload onFileSelect={vi.fn()} />);
    expect(screen.getByText('Upload a photo')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(<FileUpload onFileSelect={vi.fn()} />);
    expect(screen.getByText(/drop an image here/i)).toBeInTheDocument();
  });

  it('renders hint text with max size', () => {
    render(<FileUpload onFileSelect={vi.fn()} maxSizeMB={10} />);
    expect(screen.getByText(/max 10MB/i)).toBeInTheDocument();
  });

  it('shows preview image when provided', () => {
    render(<FileUpload onFileSelect={vi.fn()} preview="https://example.com/img.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('does not show placeholder when preview is provided', () => {
    render(<FileUpload onFileSelect={vi.fn()} preview="https://example.com/img.jpg" />);
    expect(screen.queryByText(/drop an image/i)).not.toBeInTheDocument();
  });

  it('calls onFileSelect with valid file', () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('shows error for invalid file type', () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
  });

  it('shows error for oversized file', () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} maxSizeMB={1} />);

    // Create a file > 1MB
    const largeContent = new Array(1024 * 1024 + 1).fill('a').join('');
    const file = new File([largeContent], 'big.jpg', { type: 'image/jpeg' });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });

  it('handles drag over', () => {
    render(<FileUpload onFileSelect={vi.fn()} />);
    const zone = document.querySelector('.file-upload-zone') as HTMLElement;

    fireEvent.dragOver(zone, { preventDefault: vi.fn() });
    expect(zone).toHaveClass('dragging');
  });

  it('handles drag leave', () => {
    render(<FileUpload onFileSelect={vi.fn()} />);
    const zone = document.querySelector('.file-upload-zone') as HTMLElement;

    fireEvent.dragOver(zone, { preventDefault: vi.fn() });
    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass('dragging');
  });

  it('handles file drop', () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);
    const zone = document.querySelector('.file-upload-zone') as HTMLElement;

    const file = new File(['test'], 'photo.png', { type: 'image/png' });
    fireEvent.drop(zone, {
      preventDefault: vi.fn(),
      dataTransfer: { files: [file] },
    });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('opens file dialog on click', () => {
    render(<FileUpload onFileSelect={vi.fn()} />);
    const zone = document.querySelector('.file-upload-zone') as HTMLElement;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.click(zone);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('opens file dialog on Enter key', () => {
    render(<FileUpload onFileSelect={vi.fn()} />);
    const zone = document.querySelector('.file-upload-zone') as HTMLElement;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();
  });
});
