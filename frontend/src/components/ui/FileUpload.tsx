import { useCallback, useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { CameraOutlined } from '@ant-design/icons';
import './FileUpload.css';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  preview?: string | null;
  label?: string;
}

export function FileUpload({
  onFileSelect,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
  preview,
  label = 'Upload a photo',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      const allowedTypes = accept.split(',').map((t) => t.trim());
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please use JPEG, PNG, or WebP.');
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
        return false;
      }
      setError(null);
      return true;
    },
    [accept, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) onFileSelect(file);
    },
    [onFileSelect, validateFile]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) onFileSelect(file);
    },
    [onFileSelect, validateFile]
  );

  return (
    <div className="file-upload-wrapper">
      {label && <span className="input-label">{label}</span>}
      <div
        className={`file-upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="file-upload-preview" />
        ) : (
          <div className="file-upload-placeholder">
            <CameraOutlined style={{ fontSize: 32, color: 'var(--color-text-light)' }} />
            <span>Drop an image here or click to browse</span>
            <span className="file-upload-hint">JPEG, PNG, WebP — max {maxSizeMB}MB</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="file-upload-input"
          aria-label={label}
        />
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
