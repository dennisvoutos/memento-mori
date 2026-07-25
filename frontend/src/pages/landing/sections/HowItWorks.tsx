import { motion } from 'framer-motion';
import './HowItWorks.css';

const STEPS = [
  {
    step: '01',
    title: 'Create',
    description: 'Add their name, dates, and a photo. Everything starts with a simple form — takes just a few minutes.',
  },
  {
    step: '02',
    title: 'Personalize',
    description: 'Share their life story, add timeline moments, and build a photo gallery that tells who they were.',
  },
  {
    step: '03',
    title: 'Share',
    description: 'Invite family and friends to light candles, leave messages, and keep their memory alive together.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.6, ease: [0, 0, 0.58, 1] as const },
  }),
};

export function HowItWorks() {
  return (
    <section className="landing-section how-it-works" aria-label="How it works">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">How It Works</h2>
        <p className="landing-section-subtitle">
          Creating a beautiful memorial is simple. Here's how.
        </p>
        <div className="hiw-grid">
          {STEPS.map((item, i) => (
            <motion.div
              key={item.step}
              className="hiw-card"
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={cardVariants}
            >
              <span className="hiw-step">{item.step}</span>
              <h3 className="hiw-title">{item.title}</h3>
              <p className="hiw-desc">{item.description}</p>
            </motion.div>
          ))}
        </div>
        <div className="hiw-connector" aria-hidden="true">
          <span className="hiw-line" />
        </div>
      </div>
    </section>
  );
}
