import './Avatar.css';

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
  if (src) {
    return (
      <img
        className={`avatar avatar-${size} ${className}`.trim()}
        src={src}
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
