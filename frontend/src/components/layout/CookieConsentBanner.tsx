import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import './CookieConsentBanner.css';

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  timestamp: string;
}

const COOKIE_CONSENT_KEY = 'cookie_consent';
const COOKIE_CONSENT_MAX_AGE_DAYS = 365;

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeDays: number): void {
  const maxAgeSeconds = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function getStoredConsent(): CookieConsent | null {
  try {
    const raw = readCookie(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.necessary === 'boolean' &&
      typeof parsed.analytics === 'boolean' &&
      typeof parsed.timestamp === 'string'
    ) {
      return parsed as CookieConsent;
    }
    return null;
  } catch {
    return null;
  }
}

function saveConsent(consent: CookieConsent): void {
  setCookie(COOKIE_CONSENT_KEY, JSON.stringify(consent), COOKIE_CONSENT_MAX_AGE_DAYS);
}

export function useCookieConsent(): CookieConsent | null {
  const [consent, setConsent] = useState<CookieConsent | null>(() => getStoredConsent());

  const handleConsent = useCallback((c: CookieConsent) => {
    saveConsent(c);
    setConsent(c);
  }, []);

  // Expose on window for cookie-settings access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Record<string, unknown>).__cookieConsentAccepted = consent;
    }
  }, [consent]);

  return consent;
}

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => getStoredConsent());
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  // Re-check on mount (cookie may have been set in another tab)
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    const c: CookieConsent = {
      necessary: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    };
    saveConsent(c);
    setConsent(c);
  }, []);

  const handleEssentialOnly = useCallback(() => {
    const c: CookieConsent = {
      necessary: true,
      analytics: false,
      timestamp: new Date().toISOString(),
    };
    saveConsent(c);
    setConsent(c);
  }, []);

  const handleCustomizeSave = useCallback(() => {
    const c: CookieConsent = {
      necessary: true,
      analytics,
      timestamp: new Date().toISOString(),
    };
    saveConsent(c);
    setConsent(c);
    setShowCustomize(false);
  }, [analytics]);

  const handleOpenPreferences = useCallback(() => {
    const stored = getStoredConsent();
    setAnalytics(stored?.analytics ?? false);
    setShowCustomize(true);
  }, []);

  // Expose method for footer "Cookie Settings" link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Record<string, unknown>).__openCookiePreferences = handleOpenPreferences;
    }
  }, [handleOpenPreferences]);

  if (consent && !showCustomize) {
    return null;
  }

  if (showCustomize) {
    return (
      <div className="cookie-banner cookie-banner--modal" role="dialog" aria-label="Cookie Settings">
        <div className="cookie-banner-overlay" onClick={() => setShowCustomize(false)} />
        <div className="cookie-banner-panel">
          <h2 className="cookie-banner-title">Cookie Settings</h2>
          <p className="cookie-banner-text">
            We use cookies to enhance your experience. You can choose which categories to allow.
          </p>

          <div className="cookie-banner-options">
            <div className="cookie-banner-option">
              <div className="cookie-banner-option-header">
                <strong>Strictly Necessary</strong>
                <span className="cookie-banner-toggle cookie-banner-toggle--disabled">Always On</span>
              </div>
              <p className="cookie-banner-option-desc">
                Required for the site to function. Includes authentication, CSRF protection, and your consent record.
              </p>
            </div>

            <div className="cookie-banner-option">
              <div className="cookie-banner-option-header">
                <strong>Analytics</strong>
                <button
                  type="button"
                  className={`cookie-banner-toggle ${analytics ? 'cookie-banner-toggle--on' : ''}`}
                  onClick={() => setAnalytics((prev) => !prev)}
                  role="switch"
                  aria-checked={analytics}
                  aria-label="Toggle analytics cookies"
                >
                  {analytics ? 'On' : 'Off'}
                </button>
              </div>
              <p className="cookie-banner-option-desc">
                Help us understand how visitors use the site so we can improve it. No personal data is shared.
              </p>
            </div>
          </div>

          <div className="cookie-banner-actions">
            <Button variant="secondary" size="sm" onClick={() => setShowCustomize(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCustomizeSave}>
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cookie-banner" role="alert" aria-label="Cookie consent">
      <div className="cookie-banner-content">
        <div className="cookie-banner-body">
          <p className="cookie-banner-text">
            <strong>🍪 This site uses cookies</strong>{' '}
            We use essential cookies to keep you signed in and protect your account.
            With your consent, we may also use analytics cookies to understand how you use the site.{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="cookie-banner-link">
              Privacy Policy
            </a>
          </p>
        </div>
        <div className="cookie-banner-actions">
          <Button variant="ghost" size="sm" onClick={handleOpenPreferences}>
            Customize
          </Button>
          <Button variant="secondary" size="sm" onClick={handleEssentialOnly}>
            Essential Only
          </Button>
          <Button variant="primary" size="sm" onClick={handleAcceptAll}>
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
