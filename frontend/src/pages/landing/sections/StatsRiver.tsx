import { motion } from 'framer-motion';
import { useCountUp } from '../hooks/useCountUp';
import './StatsRiver.css';

interface StatsRiverProps {
  memorialCount: number;
  candleCount: number;
  messageCount: number;
}

export function StatsRiver({ memorialCount, candleCount, messageCount }: StatsRiverProps) {
  return (
    <section className="landing-section stats-river" aria-label="Platform statistics">
      <div className="landing-section-inner">
        <motion.div
          className="sr-grid"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <StatItem label="Memorials Created" target={memorialCount} />
          <StatItem label="Candles Lit" target={candleCount} />
          <StatItem label="Messages Shared" target={messageCount} />
        </motion.div>
      </div>
    </section>
  );
}

function StatItem({ label, target }: { label: string; target: number }) {
  const { count, ref } = useCountUp({ target });

  return (
    <div className="sr-item">
      <span className="sr-number" ref={ref} aria-live="polite">
        {count.toLocaleString()}
      </span>
      <span className="sr-label">{label}</span>
    </div>
  );
}
