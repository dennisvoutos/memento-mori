import { useState, useEffect, useCallback } from 'react';
import { auth } from '../../services/api';
import type { LinkedAccount, ConnectedServiceInfo, User } from '@memento-mori/shared';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  GoogleOutlined,
  AppleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  PictureOutlined,
  CloudOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import './LinkedAccounts.css';

interface LinkedAccountsProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

type LinkingState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'linking'; provider: string }
  | { kind: 'unlinking'; provider: string }
  | { kind: 'error'; message: string };

export function LinkedAccounts({ user, onUserUpdated }: LinkedAccountsProps) {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [services, setServices] = useState<ConnectedServiceInfo[]>([]);
  const [state, setState] = useState<LinkingState>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedAccounts = useCallback(async () => {
    setState({ kind: 'loading' });
    setError(null);

    try {
      const result = await auth.linkedAccounts();
      setAccounts(result.accounts);
      setServices(result.services);
      setState({ kind: 'idle' });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to load linked accounts',
      });
    }
  }, []);

  useEffect(() => {
    fetchLinkedAccounts();
  }, [fetchLinkedAccounts]);

  const isGoogleLinked = accounts.some((a) => a.provider === 'GOOGLE');
  const isAppleLinked = accounts.some((a) => a.provider === 'APPLE');
  const isGooglePhotosConnected = services.some((s) => s.provider === 'GOOGLE_PHOTOS');
  const isICloudPhotosConnected = services.some((s) => s.provider === 'ICLOUD_PHOTOS');

  const handleLinkGoogle = useCallback(async () => {
    setState({ kind: 'linking', provider: 'GOOGLE' });
    setError(null);

    try {
      // Load Google Identity Services for incremental auth
      if (!(window as Record<string, unknown>).google?.accounts?.id) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Google sign-in could not be loaded'));
          document.head.appendChild(script);
        });
      }

      const googleApi = (window as Record<string, unknown>).google?.accounts?.id as
        | { initialize(config: Record<string, unknown>): void; renderButton?: unknown }
        | undefined;

      // For linking, we use a credential-based approach
      // Prompt the user to sign in with the Google account they want to link
      const googleConfig = await auth.googleConfig();
      const oauth2Client = (window as Record<string, unknown>).google?.accounts?.oauth2 as
        | { initCodeClient(config: Record<string, unknown>): void }
        | undefined;

      if (oauth2Client) {
        // Use OAuth 2.0 code flow for linking
        const code = await new Promise<string>((resolve, reject) => {
          oauth2Client.initCodeClient({
            client_id: googleConfig.clientId,
            scope: 'openid email profile',
            ux_mode: 'popup',
            callback: (response: { code?: string; error?: string }) => {
              if (response.error) {
                reject(new Error(`Authorization denied: ${response.error}`));
              } else if (response.code) {
                resolve(response.code);
              } else {
                reject(new Error('No authorization code received'));
              }
            },
          });
        });

        // Exchange the code server-side to get id_token and link
        // Since our backend currently only supports credential-based linking,
        // we need a different approach. Use the simpler credential flow.
      }

      // Fallback: use the credential-based flow
      const credential = await new Promise<string>((resolve, reject) => {
        if (!(window as Record<string, unknown>).google?.accounts?.id) {
          reject(new Error('Google sign-in not available'));
          return;
        }

        const api = (window as Record<string, unknown>).google.accounts.id as {
          initialize(config: Record<string, unknown>): void;
          prompt(callback?: (notification: { isNotDisplayed(): boolean; isSkippedMoment(): boolean; getNotDisplayedReason(): string }) => void): void;
        };

        // We need the user to select a different Google account
        // Using the credential flow with prompt
        api.initialize({
          client_id: googleConfig.clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              resolve(response.credential);
            } else {
              reject(new Error('No credential received'));
            }
          },
          cancel_on_tap_outside: false,
        });

        api.prompt();
      });

      const { user: updatedUser } = await auth.linkGoogle(credential);
      onUserUpdated(updatedUser);
      await fetchLinkedAccounts();
      setState({ kind: 'idle' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link Google account';
      setError(message);
      setState({ kind: 'idle' });
    }
  }, [fetchLinkedAccounts, onUserUpdated]);

  const handleLinkApple = useCallback(async () => {
    setState({ kind: 'linking', provider: 'APPLE' });
    setError(null);

    try {
      // For Apple linking, we use the redirect approach
      // Store the current state and redirect
      const appleConfig = await auth.appleConfig();

      // Open Apple auth in a popup or redirect
      // Since Apple uses form_post, we need the backend callback to handle it
      // For simplicity, we redirect the user and they'll come back
      const redirectTo = `${window.location.pathname}?tab=account`;
      window.location.href = auth.appleAuthUrl({ redirectTo });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link Apple account';
      setError(message);
      setState({ kind: 'idle' });
    }
  }, []);

  const handleUnlink = useCallback(
    async (provider: 'GOOGLE' | 'APPLE') => {
      setState({ kind: 'unlinking', provider });
      setError(null);

      try {
        const { user: updatedUser } = await auth.unlinkProvider(provider);
        onUserUpdated(updatedUser);
        await fetchLinkedAccounts();
        setState({ kind: 'idle' });
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to unlink ${provider}`;
        setError(message);
        setState({ kind: 'idle' });
      }
    },
    [fetchLinkedAccounts, onUserUpdated]
  );

  const handleDisconnectGooglePhotos = useCallback(async () => {
    setState({ kind: 'unlinking', provider: 'GOOGLE_PHOTOS' });
    setError(null);

    try {
      await auth.disconnectGooglePhotos();
      await fetchLinkedAccounts();
      setState({ kind: 'idle' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect Google Photos';
      setError(message);
      setState({ kind: 'idle' });
    }
  }, [fetchLinkedAccounts]);

  if (state.kind === 'loading') {
    return (
      <Card className="linked-accounts-card">
        <LoadingSpinner />
      </Card>
    );
  }

  const isBusy = state.kind === 'linking' || state.kind === 'unlinking';

  return (
    <Card className="linked-accounts-card">
      <h3 className="dash-account-section-title">Linked Accounts</h3>
      <p className="linked-accounts-subtitle">
        Connect accounts to sign in with any linked provider and access all your memorials.
        You must keep at least one sign-in method active.
      </p>

      {error && (
        <div className="linked-accounts-error">
          <WarningOutlined /> {error}
        </div>
      )}

      <div className="linked-accounts-list">
        {/* Google Account */}
        <div className="linked-account-item">
          <div className="linked-account-info">
            <span className="linked-account-provider">
              <GoogleOutlined /> Google
            </span>
            {isGoogleLinked ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="default">Not connected</Badge>
            )}
          </div>
          <div className="linked-account-actions">
            {isGoogleLinked ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnlink('GOOGLE')}
                isLoading={state.kind === 'unlinking' && state.provider === 'GOOGLE'}
                disabled={isBusy}
              >
                <DisconnectOutlined /> Disconnect
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLinkGoogle}
                isLoading={state.kind === 'linking' && state.provider === 'GOOGLE'}
                disabled={isBusy}
              >
                <LinkOutlined /> Connect Google
              </Button>
            )}
          </div>
        </div>

        {/* Apple Account */}
        <div className="linked-account-item">
          <div className="linked-account-info">
            <span className="linked-account-provider">
              <AppleOutlined /> Apple
            </span>
            {isAppleLinked ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="default">Not connected</Badge>
            )}
          </div>
          <div className="linked-account-actions">
            {isAppleLinked ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnlink('APPLE')}
                isLoading={state.kind === 'unlinking' && state.provider === 'APPLE'}
                disabled={isBusy}
              >
                <DisconnectOutlined /> Disconnect
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLinkApple}
                isLoading={state.kind === 'linking' && state.provider === 'APPLE'}
                disabled={isBusy}
              >
                <LinkOutlined /> Connect Apple
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Connected Services */}
      <h3 className="dash-account-section-title" style={{ marginTop: 24 }}>
        Connected Services
      </h3>

      <div className="linked-accounts-list">
        {/* Google Photos */}
        <div className="linked-account-item">
          <div className="linked-account-info">
            <span className="linked-account-provider">
              <PictureOutlined /> Google Photos
            </span>
            {isGooglePhotosConnected ? (
              <Badge variant="success">Authorized</Badge>
            ) : isGoogleLinked ? (
              <Badge variant="default">Not authorized</Badge>
            ) : (
              <span className="linked-accounts-hint">Requires Google sign-in first</span>
            )}
          </div>
          <div className="linked-account-actions">
            {isGooglePhotosConnected ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectGooglePhotos}
                isLoading={state.kind === 'unlinking' && state.provider === 'GOOGLE_PHOTOS'}
                disabled={isBusy}
              >
                <DisconnectOutlined /> Revoke Access
              </Button>
            ) : null}
          </div>
        </div>

        {/* iCloud Photos */}
        <div className="linked-account-item">
          <div className="linked-account-info">
            <span className="linked-account-provider">
              <CloudOutlined /> iCloud Photos
            </span>
            {isICloudPhotosConnected ? (
              <Badge variant="success">Authorized</Badge>
            ) : (
              <span className="linked-accounts-hint">Apple web API not yet available</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
