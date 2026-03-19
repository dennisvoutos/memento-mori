import { DeleteOutlined } from '@ant-design/icons';
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

  return (
    <div className={`memory-card memory-${type.toLowerCase()}`}>
      {type === 'PHOTO' && resolvedMediaUrl && (
        <img src={resolvedMediaUrl} alt={caption || 'Memory'} className="memory-photo" />
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
