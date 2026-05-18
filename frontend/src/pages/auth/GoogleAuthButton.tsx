import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { auth } from '../../services/api';

type GoogleButtonText = 'signin_with' | 'signup_with';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleButtonOptions {
  type?: 'standard';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: GoogleButtonText;
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

interface GoogleAccountsIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsIdApi;
      };
    };
  }
}

interface GoogleAuthButtonProps {
  label: string;
  text: GoogleButtonText;
  onCredential: (credential: string) => Promise<void>;
  onError: (message: string) => void;
  isBusy?: boolean;
}

let googleIdentityScriptPromise: Promise<void> | null = null;
let googleClientConfigPromise: Promise<{ clientId: string }> | null = null;

function getGoogleIdentityApi(): GoogleAccountsIdApi | null {
  return window.google?.accounts?.id ?? null;
}

function loadGoogleIdentityScript(): Promise<void> {
  if (getGoogleIdentityApi()) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity-client="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(undefined), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Google sign-in could not be loaded.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityClient = 'true';
    script.onload = () => resolve(undefined);
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    document.head.appendChild(script);
  }).catch((error) => {
    googleIdentityScriptPromise = null;
    throw error;
  });

  return googleIdentityScriptPromise ?? Promise.resolve();
}

function getGoogleClientConfig() {
  if (!googleClientConfigPromise) {
    googleClientConfigPromise = auth.googleConfig().catch((error) => {
      googleClientConfigPromise = null;
      throw error;
    });
  }

  return googleClientConfigPromise;
}

function getGoogleButtonWidth(element: HTMLElement): number {
  const measuredWidth = Math.floor(element.getBoundingClientRect().width);
  if (measuredWidth > 0) {
    return measuredWidth;
  }

  return 360;
}

export function GoogleAuthButton({
  label,
  text,
  onCredential,
  onError,
  isBusy = false,
}: GoogleAuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCredentialResponse = useEffectEvent(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        onError('Google sign-in failed. Please try again.');
        return;
      }

      setIsSubmitting(true);
      try {
        await onCredential(response.credential);
      } catch (error) {
        onError(
          error instanceof Error ? error.message : 'Google sign-in failed. Please try again.'
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  );

  const handleInitializationError = useEffectEvent((error: unknown) => {
    onError(
      error instanceof Error
        ? error.message
        : 'Google sign-in is unavailable right now. Please try again.'
    );
  });

  useEffect(() => {
    let isActive = true;

    async function initializeGoogleButton() {
      setIsInitializing(true);

      try {
        const [{ clientId }] = await Promise.all([
          getGoogleClientConfig(),
          loadGoogleIdentityScript(),
        ]);

        if (!isActive || !buttonRef.current) {
          return;
        }

        const googleApi = getGoogleIdentityApi();
        if (!googleApi) {
          throw new Error('Google sign-in could not be loaded.');
        }

        buttonRef.current.innerHTML = '';

        googleApi.initialize({
          client_id: clientId,
          callback: (response) => {
            void handleCredentialResponse(response);
          },
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
        });

        googleApi.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: getGoogleButtonWidth(buttonRef.current),
        });
      } catch (error) {
        if (isActive) {
          handleInitializationError(error);
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    }

    void initializeGoogleButton();

    return () => {
      isActive = false;
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
    };
  }, [text]);

  return (
    <div className="auth-google-slot" aria-label={label}>
      <div ref={buttonRef} className="auth-google-render-target" />
      {(isInitializing || isSubmitting || isBusy) && (
        <div className="auth-google-overlay">Connecting to Google…</div>
      )}
    </div>
  );
}