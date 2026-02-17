import type { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'glass' | 'solid';
}

export function Card({ children, className = '', variant = 'glass' }: CardProps) {
  return (
    <div className={`card card-${variant} ${className}`.trim()}>
      {children}
    </div>
  );
}
