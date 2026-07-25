import { motion } from 'framer-motion';
import './FeatureHighlights.css';

const FEATURES = [
  { icon: '🏛️', title: 'Permanent & Free', desc: 'Your memorial stays online forever. No subscription, no hidden costs.' },
  { icon: '🔒', title: 'Private or Public', desc: 'You choose who sees it — keep it private, share with a link, or make it public.' },
  { icon: '🖼️', title: 'Photo Galleries', desc: 'Upload photos that tell their story. Beautiful galleries with lightbox viewing.' },
  { icon: '🕯️', title: 'Light a Candle', desc: 'Visitors can light virtual candles — a simple, powerful gesture of remembrance.' },
  { icon: '📅', title: 'Life Timeline', desc: 'Mark the moments that mattered. From birth to the legacy they left behind.' },
  { icon: '💬', title: 'Tributes & Messages', desc: 'Friends and family leave messages, quotes, and memories on the memorial wall.' },
];

export function FeatureHighlights() {
  return (
    <section className="landing-section feature-highlights" aria-label="Features">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">Everything You Need</h2>
        <p className="landing-section-subtitle">
          A complete space to honor, remember, and celebrate a life well lived.
        </p>
        <div className="fh-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="fh-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <span className="fh-icon" aria-hidden="true">{f.icon}</span>
              <h3 className="fh-title">{f.title}</h3>
              <p className="fh-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
