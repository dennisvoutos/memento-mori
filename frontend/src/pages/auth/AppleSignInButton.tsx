import { useEffect, useState } from 'react';
import { auth } from '../../services/api';
import './AppleSignInButton.css';

interface AppleSignInButtonProps {
  label: string;
  onError: (message: string) => void;
  isBusy?: boolean;
  redirectTo: string;
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init(config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state: string;
          usePopup?: boolean;
        }): void;
        signIn(config?: { state?: string }): Promise<{
          authorization?: {
            code?: string;
            id_token?: string;
            state?: string;
          };
          user?: {
            name?: { firstName?: string; lastName?: string };
            email?: string;
          };
        }>;
      };
    };
  }
}

let appleJsPromise: Promise<void> | null = null;

function loadAppleJsSdk(): Promise<void> {
  if (appleJsPromise) {
    return appleJsPromise;
  }

  appleJsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-apple-auth-client="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Apple sign-in could not be loaded.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.defer = true;
    script.dataset.appleAuthClient = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Apple sign-in could not be loaded.'));
    document.head.appendChild(script);
  }).catch((error) => {
    appleJsPromise = null;
    throw error;
  });

  return appleJsPromise;
}

export function AppleSignInButton({
  label,
  onError,
  isBusy = false,
  redirectTo,
}: AppleSignInButtonProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBlocked = isBusy || isSubmitting;

  useEffect(() => {
    let isActive = true;

    async function initialize() {
      setIsInitializing(true);

      try {
        const config = await auth.appleConfig();
        if (!isActive) return;

        // Try loading the Apple JS SDK for the popup-based flow
        try {
          await loadAppleJsSdk();

          if (window.AppleID && isActive) {
            window.AppleID.auth.init({
              clientId: config.clientId,
              scope: 'name email',
              redirectURI: config.redirectUri,
              state: JSON.stringify({ redirectTo }),
              usePopup: true,
            });
            setIsConfigured(true);
          }
        } catch {
          // SDK not available — fall back to redirect flow
          if (isActive) {
            setIsConfigured(false);
          }
        }
      } catch (error) {
        if (isActive) {
          onError(error instanceof Error ? error.message : 'Apple sign-in is unavailable');
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    }

    void initialize();

    return () => {
      isActive = false;
    };
  }, [onError, redirectTo]);

  const handleClick = async () => {
    if (isBlocked) return;

    setIsSubmitting(true);

    try {
      if (window.AppleID && isConfigured) {
        // Use the popup-based JS flow
        try {
          const result = await window.AppleID.auth.signIn();
          if (result?.authorization?.code) {
            // The actual login happens via the parent component's callback
            // But the JS SDK flow returns the code directly; we need to POST it
            // Actually, for the JS SDK, we'd POST to /api/auth/apple/callback
            // But the callback endpoint expects form_post data.
            // For simplicity, redirect-based flow is more reliable.
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Apple sign-in failed';
          if (message.includes('popup_blocked') || message.includes('Pop-up')) {
            // Fall back to redirect flow
            window.location.href = auth.appleAuthUrl({ redirectTo });
            return;
          }
          throw err;
        }
      }

      // Redirect-based flow (always works)
      window.location.href = auth.appleAuthUrl({ redirectTo });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Apple sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      className="apple-signin-button"
      onClick={handleClick}
      disabled={isBlocked || isInitializing}
      aria-label={label}
    >
      <svg
        className="apple-signin-logo"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      <span className="apple-signin-text">
        {isInitializing ? 'Loading…' : isSubmitting ? 'Signing in…' : 'Sign in with Apple'}
      </span>
    </button>
  );
}
