import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../stores/authStore';
import { useParticleCanvas } from '../hooks/useParticleCanvas';
import './HeroSection.css';

export function HeroSection() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchQuery, setSearchQuery] = useState('');

  const { canvasRef } = useParticleCanvas({
    count: 80,
    colors: [
      'rgba(123, 111, 158, 0.4)',
      'rgba(197, 160, 89, 0.3)',
      'rgba(200, 195, 220, 0.35)',
    ],
    speed: 0.3,
    shape: 'scattered',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCTA = () => {
    navigate(isAuthenticated ? '/memorials/new' : '/register');
  };

  return (
    <section className="landing-section hero-section" aria-label="Hero">
      <canvas
        ref={canvasRef}
        className="hero-canvas"
        role="img"
        aria-label="Soft floating particles in lavender and gold tones"
      />
      <div className="hero-fallback" aria-hidden="true" />

      <div className="landing-section-inner hero-content">
        <motion.div
          className="hero-logo-wrap"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0, 0, 0.58, 1] as const }}
        >
          <img
            src="/logo-no-background.png"
            alt=""
            className="hero-logo"
            aria-hidden="true"
          />
        </motion.div>

        <motion.h1
          className="hero-headline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          Honoring Every Story.
        </motion.h1>

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          A quiet, beautiful space to remember and celebrate those who shaped our lives.
        </motion.p>

        <motion.form
          className="hero-search"
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
        >
          <SearchOutlined className="hero-search-icon" />
          <input
            type="text"
            placeholder="Search for a memorial…"
            aria-label="Search for a memorial"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="hero-search-btn">
            Search
          </button>
        </motion.form>

        <motion.button
          className="hero-cta"
          onClick={handleCTA}
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
        >
          Create a Memorial
        </motion.button>
      </div>
    </section>
  );
}
