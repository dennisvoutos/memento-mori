import { useEffect, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Skeleton } from 'antd';
import './MemoryCard.css';
import { resolveMediaUrl } from '../lib/media';

interface MemoryCardProps {
  type: string;
  content?: string | null;
  mediaUrl?: string | null;
  caption?: string | null;
  authorName?: string;
  createdAt: string;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function MemoryCard({
  type,
  content,
  mediaUrl,
  caption,
  authorName,
  createdAt,
  onDelete,
  canDelete,
}: MemoryCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const resolvedMediaUrl = resolveMediaUrl(mediaUrl);
  const [isImageLoading, setIsImageLoading] = useState(Boolean(resolvedMediaUrl));
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setIsImageLoading(Boolean(resolvedMediaUrl));
    setHasImageError(false);
  }, [resolvedMediaUrl]);

  return (
    <div className={`memory-card memory-${type.toLowerCase()}`}>
      {type === 'PHOTO' && resolvedMediaUrl && !hasImageError && (
        <div className="memory-photo-wrap">
          {isImageLoading && (
            <div className="memory-photo-skeleton">
              <Skeleton.Image active style={{ width: '100%', height: 260 }} />
            </div>
          )}
          <img
            src={resolvedMediaUrl}
            alt={caption || 'Memory'}
            className={`memory-photo${isImageLoading ? ' memory-photo-hidden' : ''}`}
            onLoad={() => setIsImageLoading(false)}
            onError={() => {
              setIsImageLoading(false);
              setHasImageError(true);
            }}
          />
        </div>
      )}

      {type === 'PHOTO' && (caption || content) && (
        <div className="memory-caption">
          {caption && <h4 className="memory-caption-title">{caption}</h4>}
          {content && <p className="memory-caption-text">{content}</p>}
        </div>
      )}

      {type === 'QUOTE' && content && (
        <blockquote className="memory-quote">"{content}"</blockquote>
      )}

      {(type === 'TEXT' || type === 'TRIBUTE') && content && (
        <p className="memory-text">{content}</p>
      )}

      <div className="memory-meta">
        {type === 'TRIBUTE' && (
          <span className="memory-type-badge">Tribute</span>
        )}
        {authorName && <span className="memory-author">{authorName}</span>}
        <span className="memory-date">{formattedDate}</span>
        {canDelete && onDelete && (
          <button className="memory-delete" onClick={onDelete} type="button">
            <DeleteOutlined /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
