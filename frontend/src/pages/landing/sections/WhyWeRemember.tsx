import { motion } from 'framer-motion';
import './WhyWeRemember.css';

export function WhyWeRemember() {
  return (
    <section className="landing-section why-we-remember" aria-label="Why we remember">
      <div className="landing-section-inner">
        <motion.blockquote
          className="wwr-quote"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0, 0, 0.58, 1] as const }}
        >
          <p>
            &ldquo;A life is not measured by its length
            <br />
            but by the love it leaves behind.&rdquo;
          </p>
          <footer className="wwr-attribution">&mdash; Unknown</footer>
        </motion.blockquote>
      </div>
    </section>
  );
}
