import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${className}`.trim()}>
      {label && <label htmlFor={inputId} className="input-label">{label}</label>}
      <input
        id={inputId}
        className="input-field"
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${inputId}-error`} className="input-error-text" role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="input-helper">{helperText}</span>
      )}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${className}`.trim()}>
      {label && <label htmlFor={inputId} className="input-label">{label}</label>}
      <textarea
        id={inputId}
        className="input-field input-textarea"
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${inputId}-error`} className="input-error-text" role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="input-helper">{helperText}</span>
      )}
    </div>
  );
}
