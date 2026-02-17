import './MemoryCard.css';

interface MemoryCardProps {
  type: string;
  content?: string | null;
  mediaUrl?: string | null;
  authorName?: string;
  createdAt: string;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function MemoryCard({
  type,
  content,
  mediaUrl,
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

  return (
    <div className={`memory-card memory-${type.toLowerCase()}`}>
      {type === 'PHOTO' && mediaUrl && (
        <img src={mediaUrl} alt="Memory" className="memory-photo" />
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
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
