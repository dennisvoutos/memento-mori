import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { HeroSection } from './sections/HeroSection';
import { StatsRiver } from './sections/StatsRiver';
import { HowItWorks } from './sections/HowItWorks';
import { InlineCTA } from './sections/InlineCTA';
import { FeaturedMemorials } from './sections/FeaturedMemorials';
import { WhyWeRemember } from './sections/WhyWeRemember';
import { FeatureHighlights } from './sections/FeatureHighlights';
import { CommunitySection } from './sections/CommunitySection';
import { FinalCTA } from './sections/FinalCTA';
import './LandingPage.css';

const SHOW_STATS = import.meta.env.VITE_FEATURE_STATS === 'true';

interface StatsData {
  memorialCount: number;
  candleCount: number;
  messageCount: number;
}

const EMPTY_STATS: StatsData = { memorialCount: 0, candleCount: 0, messageCount: 0 };

export default function LandingPage() {
  const [stats, setStats] = useState<StatsData>(EMPTY_STATS);

  useEffect(() => {
    if (SHOW_STATS) {
      api.stats.public().then(setStats).catch(() => {});
    }
  }, []);

  return (
    <main>
      <HeroSection />
      {SHOW_STATS && (
        <>
          <StatsRiver {...stats} />
          <CommunitySection memorialCount={stats.memorialCount} />
        </>
      )}
      <HowItWorks />
      <InlineCTA />
      <FeaturedMemorials />
      <WhyWeRemember />
      <FeatureHighlights />
      <FinalCTA />
    </main>
  );
}
