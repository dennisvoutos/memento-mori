import { useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import './Avatar.css';
import { resolveMediaUrl } from '../../lib/media';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
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
  const [isImageLoading, setIsImageLoading] = useState(Boolean(resolvedSrc));
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setIsImageLoading(Boolean(resolvedSrc));
    setHasImageError(false);
  }, [resolvedSrc]);

  const avatarClassName = `avatar avatar-${size} ${className}`.trim();

  const sizeMap = {
    sm: 36,
    md: 56,
    lg: 80,
    xl: 120,
    xxl: 200,
  } as const;

  if (resolvedSrc && !hasImageError) {
    return (
      <div className={`avatar-shell avatar-${size} ${className}`.trim()}>
        {isImageLoading && (
          <Skeleton.Avatar
            active
            shape="circle"
            size={sizeMap[size]}
            className="avatar-skeleton"
          />
        )}
        <img
          className={`${avatarClassName}${isImageLoading ? ' avatar-hidden' : ''}`}
          src={resolvedSrc}
          alt={name}
          onLoad={() => setIsImageLoading(false)}
          onError={() => {
            setIsImageLoading(false);
            setHasImageError(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`avatar avatar-${size} avatar-initials ${className}`.trim()}>
      {getInitials(name)}
    </div>
  );
}
