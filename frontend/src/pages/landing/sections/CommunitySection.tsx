import { motion } from 'framer-motion';
import { useParticleCanvas } from '../hooks/useParticleCanvas';
import './CommunitySection.css';

interface CommunitySectionProps {
  memorialCount: number;
}

export function CommunitySection({ memorialCount }: CommunitySectionProps) {
  const { canvasRef } = useParticleCanvas({
    count: 120,
    colors: [
      'rgba(123, 111, 158, 0.35)',
      'rgba(140, 130, 175, 0.3)',
      'rgba(180, 170, 210, 0.25)',
    ],
    speed: 0.2,
    shape: 'heart',
  });

  return (
    <section className="landing-section community-section" aria-label="Community">
      <canvas
        ref={canvasRef}
        className="community-canvas"
        role="img"
        aria-label="Glowing dots forming a heart shape, representing the community"
      />
      <div className="landing-section-inner community-content">
        <motion.div
          className="community-text"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
        >
          <p className="community-count">
            Join {memorialCount > 0 ? memorialCount.toLocaleString() : ''} families
          </p>
          <p className="community-sub">
            who have created memorials to honor their loved ones.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
