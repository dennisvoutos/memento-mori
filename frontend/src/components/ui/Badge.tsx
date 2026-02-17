import type { ReactNode } from 'react';
import './Badge.css';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'private' | 'shared' | 'public';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
