import { useEffect, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Image, Skeleton } from 'antd';
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
  deleteLabel?: string;
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
  deleteLabel = 'Delete',
}: MemoryCardProps) {
  const isPhoto = type === 'PHOTO';
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const resolvedMediaUrl = resolveMediaUrl(mediaUrl);
  const normalizedCaption = caption?.trim() || null;
  const normalizedContent = content?.trim() || null;
  const photoAltText = normalizedCaption || normalizedContent || 'Memory';
  const [isImageLoading, setIsImageLoading] = useState(Boolean(resolvedMediaUrl));
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setIsImageLoading(Boolean(resolvedMediaUrl));
    setHasImageError(false);
  }, [resolvedMediaUrl]);

  return (
    <div className={`memory-card memory-${type.toLowerCase()}`}>
      {isPhoto && resolvedMediaUrl && !hasImageError && (
        <div className="memory-photo-wrap">
          {isImageLoading && (
            <div className="memory-photo-skeleton">
              <Skeleton.Image active style={{ width: '100%', height: '100%' }} />
            </div>
          )}
          <Image
            src={resolvedMediaUrl}
            alt={photoAltText}
            width="100%"
            height="100%"
            className={`memory-photo-viewer${isImageLoading ? ' memory-photo-hidden' : ''}`}
            preview={{
              mask: <span className="memory-photo-preview-mask">View full screen</span>,
            }}
            onLoad={() => setIsImageLoading(false)}
            onError={() => {
              setIsImageLoading(false);
              setHasImageError(true);
            }}
          />
        </div>
      )}

      {isPhoto && (normalizedCaption || normalizedContent) && (
        <div className="memory-caption">
          {normalizedCaption && <h4 className="memory-caption-title">{normalizedCaption}</h4>}
          {normalizedContent && <p className="memory-caption-text">{normalizedContent}</p>}
        </div>
      )}

      {type === 'QUOTE' && normalizedContent && (
        <blockquote className="memory-quote">"{normalizedContent}"</blockquote>
      )}

      {(type === 'TEXT' || type === 'TRIBUTE') && normalizedContent && (
        <p className="memory-text">{normalizedContent}</p>
      )}

      <div className="memory-meta">
        {type === 'TRIBUTE' && (
          <span className="memory-type-badge">Tribute</span>
        )}
        {authorName && <span className="memory-author">{authorName}</span>}
        <span className="memory-date">{formattedDate}</span>
        {canDelete && onDelete && (
          <button className="memory-delete" onClick={onDelete} type="button">
            <DeleteOutlined /> {deleteLabel}
          </button>
        )}
      </div>
    </div>
  );
}
