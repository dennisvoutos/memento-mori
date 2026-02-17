import './Timeline.css';

interface TimelineItem {
  id: string;
  title: string;
  description?: string | null;
  date: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  if (items.length === 0) return null;

  return (
    <div className="timeline">
      {items.map((item, index) => (
        <div className="timeline-item" key={item.id}>
          <div className="timeline-line">
            <div className="timeline-dot" />
            {index < items.length - 1 && <div className="timeline-connector" />}
          </div>
          <div className="timeline-content">
            <span className="timeline-date">{item.date}</span>
            <h4 className="timeline-title">{item.title}</h4>
            {item.description && (
              <p className="timeline-desc">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
