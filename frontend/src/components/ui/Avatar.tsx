import './Avatar.css';
import { resolveMediaUrl } from '../../lib/media';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const resolvedSrc = resolveMediaUrl(src);

  if (resolvedSrc) {
    return (
      <img
        className={`avatar avatar-${size} ${className}`.trim()}
        src={resolvedSrc}
        alt={name}
      />
    );
  }

  return (
    <div className={`avatar avatar-${size} avatar-initials ${className}`.trim()}>
      {getInitials(name)}
    </div>
  );
}
