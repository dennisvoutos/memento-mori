import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ADSENSE_CLIENT, isAdSenseConfigured } from '../../lib/adsense';
import './GoogleAd.css';

interface GoogleAdProps {
  /** AdSense slot ID for this specific placement. */
  slotId: string;
}

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>> | undefined;
  }
}

/** Injects the AdSense bootstrap script once, if not already present. */
function ensureAdSenseScript(): void {
  if (!isAdSenseConfigured()) return;

  const existing = document.querySelector(
    'script[src*="pagead2.googlesyndication.com"]',
  );
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

/**
 * Google AdSense ad unit.
 *
 * Renders nothing when `VITE_ADSENSE_CLIENT` is not set (pre-production safe).
 * Dynamically injects the AdSense bootstrap script on first mount.
 * Re-pushes ads on route changes so they reload correctly in the SPA.
 */
export function GoogleAd({ slotId }: GoogleAdProps) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const configured = isAdSenseConfigured();

  useEffect(() => {
    if (!configured) return;

    ensureAdSenseScript();

    // Give the AdSense script a tick to parse the new <ins> element,
    // then push it onto the queue so an ad is fetched.
    const timer = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // AdSense push can throw when the script hasn't loaded yet — safe to ignore.
      }
    }, 0);

    return () => clearTimeout(timer);
    // Re-run on every route change so ads reload.
  }, [location.pathname, location.search, configured]);

  if (!configured) return null;

  return (
    <div className="ad-container" ref={containerRef}>
      <span className="ad-label">Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
