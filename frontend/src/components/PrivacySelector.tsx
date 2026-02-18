import { LockOutlined, LinkOutlined, GlobalOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import './PrivacySelector.css';

interface PrivacySelectorProps {
  value: string;
  onChange: (value: 'PRIVATE' | 'SHARED_LINK' | 'PUBLIC') => void;
}

const options: { value: 'PRIVATE' | 'SHARED_LINK' | 'PUBLIC'; label: string; icon: ReactNode; description: string }[] = [
  {
    value: 'PRIVATE',
    label: 'Private',
    icon: <LockOutlined />,
    description: 'Only invited people can view this memorial.',
  },
  {
    value: 'SHARED_LINK',
    label: 'Shared Link',
    icon: <LinkOutlined />,
    description: 'Anyone with the link can view this memorial.',
  },
  {
    value: 'PUBLIC',
    label: 'Public',
    icon: <GlobalOutlined />,
    description: 'Anyone can find and view this memorial.',
  },
];

export function PrivacySelector({ value, onChange }: PrivacySelectorProps) {
  return (
    <div className="privacy-selector">
      <span className="input-label">Privacy Level</span>
      <div className="privacy-options">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`privacy-option ${value === opt.value ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="privacyLevel"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="privacy-radio"
            />
            <span className="privacy-icon">{opt.icon}</span>
            <span className="privacy-label">{opt.label}</span>
            <span className="privacy-desc">{opt.description}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
