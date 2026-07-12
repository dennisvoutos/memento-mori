import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../../services/api';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import type { SelectedPhoto } from './CloudPhotoPicker';
import type { GooglePhotoItem } from './types';
import {
  GoogleOutlined,
  ReloadOutlined,
  CheckOutlined,
  WarningOutlined,
} from '@ant-design/icons';

interface GooglePhotosPickerProps {
  memorialId?: string;
  maxPhotos: number;
  maxPhotoSizeMB: number;
  onPhotosSelected: (photos: SelectedPhoto[]) => void;
}

type PickerState =
  | { kind: 'loading-config' }
  | { kind: 'not-connected' }
  | { kind: 'connecting' }
  | { kind: 'loading-photos' }
  | { kind: 'browsing'; photos: GooglePhotoItem[]; selectedIds: Set<string> }
  | { kind: 'downloading'; total: number; current: number }
  | { kind: 'error'; message: string }
  | { kind: 'no-photos' };

const GOOGLE_PHOTOS_API = 'https://photoslibrary.googleapis.com/v1';
const PAGE_SIZE = 50;

export function GooglePhotosPicker({
  maxPhotos,
  maxPhotoSizeMB,
  onPhotosSelected,
}: GooglePhotosPickerProps) {
  const [state, setState] = useState<PickerState>({ kind: 'loading-config' });
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const photosAccessTokenRef = useRef<string | null>(null);

  /* ── load access token (with auto-refresh) ── */
  const loadPhotosAccessToken = useCallback(async () => {
    try {
      const tokenResp = await auth.getGooglePhotosAccessToken();
      photosAccessTokenRef.current = tokenResp.accessToken;
      return tokenResp.accessToken;
    } catch {
      return null;
    }
  }, []);

  /* ── fetch photos from Google Photos API ── */
  const fetchPhotos = useCallback(async () => {
    setState({ kind: 'loading-photos' });

    try {
      let accessToken = photosAccessTokenRef.current;
      if (!accessToken) {
        accessToken = await loadPhotosAccessToken();
      }

      if (!accessToken) {
        setState({ kind: 'not-connected' });
        return;
      }

      const response = await fetch(
        `${GOOGLE_PHOTOS_API}/mediaItems?pageSize=${PAGE_SIZE}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired — retry once with a fresh token
          photosAccessTokenRef.current = null;
          const newToken = await loadPhotosAccessToken();
          if (newToken) {
            const retryResponse = await fetch(
              `${GOOGLE_PHOTOS_API}/mediaItems?pageSize=${PAGE_SIZE}`,
              {
                headers: {
                  Authorization: `Bearer ${newToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!retryResponse.ok) {
              throw new Error(`Failed to load photos (${retryResponse.status})`);
            }

            const retryData = await retryResponse.json() as {
              mediaItems?: Array<{
                id: string;
                baseUrl: string;
                filename: string;
                mimeType: string;
                mediaMetadata?: { width?: string; height?: string; creationTime?: string };
              }>;
            };

            const photos: GooglePhotoItem[] = (retryData.mediaItems ?? []).map((item) => ({
              id: item.id,
              baseUrl: item.baseUrl,
              filename: item.filename,
              mimeType: item.mimeType,
              width: parseInt(item.mediaMetadata?.width ?? '0', 10),
              height: parseInt(item.mediaMetadata?.height ?? '0', 10),
              createdAt: item.mediaMetadata?.creationTime ?? '',
            }));

            if (photos.length === 0) {
              setState({ kind: 'no-photos' });
            } else {
              setState({ kind: 'browsing', photos, selectedIds: new Set() });
            }
            return;
          }
          setState({ kind: 'not-connected' });
          return;
        }

        throw new Error(`Failed to load photos (${response.status})`);
      }

      const data = await response.json() as {
        mediaItems?: Array<{
          id: string;
          baseUrl: string;
          filename: string;
          mimeType: string;
          mediaMetadata?: { width?: string; height?: string; creationTime?: string };
        }>;
      };

      const photos: GooglePhotoItem[] = (data.mediaItems ?? []).map((item) => ({
        id: item.id,
        baseUrl: item.baseUrl,
        filename: item.filename,
        mimeType: item.mimeType,
        width: parseInt(item.mediaMetadata?.width ?? '0', 10),
        height: parseInt(item.mediaMetadata?.height ?? '0', 10),
        createdAt: item.mediaMetadata?.creationTime ?? '',
      }));

      if (photos.length === 0) {
        setState({ kind: 'no-photos' });
      } else {
        setState({ kind: 'browsing', photos, selectedIds: new Set() });
      }
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to load photos',
      });
    }
  }, [loadPhotosAccessToken]);

  /* ── check connection & detect OAuth redirect return ── */
  const checkConnection = useCallback(async () => {
    setState({ kind: 'loading-config' });
    setErrorDetails(null);

    try {
      // Detect return from the Google OAuth redirect flow.
      // The backend redirects back with:
      //   ?photosConnected=true  on success
      //   ?photosError=...       on failure
      const searchParams = new URLSearchParams(window.location.search);
      const photosConnected = searchParams.get('photosConnected');
      const photosError = searchParams.get('photosError');

      if (photosConnected === 'true' || photosError) {
        const wasPending = sessionStorage.getItem('googlePhotosPending');
        sessionStorage.removeItem('googlePhotosPending');

        // Clean URL params so they don't survive a refresh
        const cleanSearch = window.location.search
          .replace(/[?&]photosConnected=true/, '')
          .replace(/[?&]photosError=[^&]+/, '')
          .replace(/^\?$/, '');
        window.history.replaceState(null, '', window.location.pathname + cleanSearch);

        if (wasPending === 'true' && photosConnected === 'true') {
          const config = await auth.googlePhotosConfig();
          if (config.isAuthorized) {
            await fetchPhotos();
            return;
          }
        }

        if (photosError) {
          setState({
            kind: 'error',
            message: `Google Photos authorization failed: ${photosError.replace(/_/g, ' ')}`,
          });
          return;
        }
      }

      const config = await auth.googlePhotosConfig();
      if (!config.isAuthorized) {
        setState({ kind: 'not-connected' });
        return;
      }

      await fetchPhotos();
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to check Google Photos status',
      });
    }
  }, [fetchPhotos]);

  /* ── connect via redirect-based OAuth ── */
  const connectGooglePhotos = useCallback(async () => {
    setState({ kind: 'connecting' });

    try {
      // Get the Google OAuth 2.0 authorization URL from the backend.
      // Format:
      //   https://accounts.google.com/o/oauth2/v2/auth?
      //     scope=<all configured scopes>&
      //     access_type=offline&
      //     include_granted_scopes=true&
      //     response_type=code&
      //     state=<signed JWT>&
      //     redirect_uri=<backend callback>&
      //     client_id=<client_id>&
      //     prompt=consent
      //
      // After consent, Google redirects to our backend callback which
      // exchanges the code, stores tokens encrypted, and redirects back
      // to this page with ?photosConnected=true or ?photosError=...
      const returnTo = window.location.pathname + window.location.search;
      const { url } = await auth.getGooglePhotosAuthUrl(returnTo);

      try {
        sessionStorage.setItem('googlePhotosPending', 'true');
      } catch {
        // Storage unavailable — proceed anyway
      }

      window.location.href = url;
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to connect Google Photos',
      });
    }
  }, []);

  /* ── toggle photo selection ── */
  const toggleSelection = useCallback(
    (photoId: string) => {
      setState((prev) => {
        if (prev.kind !== 'browsing') return prev;
        const next = new Set(prev.selectedIds);
        if (next.has(photoId)) {
          next.delete(photoId);
        } else if (next.size < maxPhotos) {
          next.add(photoId);
        }
        return { ...prev, selectedIds: next };
      });
    },
    [maxPhotos]
  );

  /* ── download selected photos & feed to parent ── */
  const downloadAndUpload = useCallback(async () => {
    if (state.kind !== 'browsing' || state.selectedIds.size === 0) return;

    const selectedPhotos = state.photos.filter((p) => state.selectedIds.has(p.id));
    const accessToken = photosAccessTokenRef.current;

    if (!accessToken) {
      setErrorDetails('No access token available. Please reconnect Google Photos.');
      return;
    }

    setState({ kind: 'downloading', total: selectedPhotos.length, current: 0 });

    const results: SelectedPhoto[] = [];
    const errors: string[] = [];
    const maxBytes = maxPhotoSizeMB * 1024 * 1024;

    for (let i = 0; i < selectedPhotos.length; i++) {
      const photo = selectedPhotos[i];
      setState({ kind: 'downloading', total: selectedPhotos.length, current: i + 1 });

      try {
        // Download at original resolution via baseUrl with size params
        const downloadUrl = `${photo.baseUrl}=w${photo.width}-h${photo.height}`;

        const response = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          errors.push(`${photo.filename}: Failed to download`);
          continue;
        }

        const blob = await response.blob();

        if (blob.size > maxBytes) {
          // Try a downscaled version
          const downscaledUrl = `${photo.baseUrl}=w1024-h1024`;
          const downscaledResponse = await fetch(downscaledUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!downscaledResponse.ok) {
            errors.push(`${photo.filename}: Exceeds ${maxPhotoSizeMB}MB limit`);
            continue;
          }

          const downscaledBlob = await downscaledResponse.blob();
          if (downscaledBlob.size > maxBytes) {
            errors.push(`${photo.filename}: Exceeds ${maxPhotoSizeMB}MB limit`);
            continue;
          }

          const file = new File([downscaledBlob], photo.filename, {
            type: photo.mimeType || 'image/jpeg',
          });

          results.push({
            file,
            source: 'google-photos',
            previewUrl: URL.createObjectURL(downscaledBlob),
          });
        } else {
          const file = new File([blob], photo.filename, {
            type: photo.mimeType || 'image/jpeg',
          });

          results.push({
            file,
            source: 'google-photos',
            previewUrl: URL.createObjectURL(blob),
          });
        }
      } catch {
        errors.push(`${photo.filename}: Download failed`);
      }
    }

    if (errors.length > 0) {
      console.warn('Photo download errors:', errors);
      setErrorDetails(errors.join('\n'));
    }

    if (results.length > 0) {
      onPhotosSelected(results);
    }

    // Return to browsing
    if (state.kind === 'downloading') {
      setState({
        kind: 'browsing',
        photos: (state as typeof state & { photos: GooglePhotoItem[] }).photos,
        selectedIds: (state as typeof state & { selectedIds: Set<string> }).selectedIds,
      });
    }
  }, [state, maxPhotoSizeMB, onPhotosSelected]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  /* ── RENDER ── */

  if (state.kind === 'loading-config') {
    return (
      <div className="google-photos-status">
        <LoadingSpinner />
        <p>Checking Google Photos connection…</p>
      </div>
    );
  }

  if (state.kind === 'not-connected') {
    return (
      <div className="google-photos-status">
        <GoogleOutlined className="google-photos-icon" />
        <h4>Google Photos Not Connected</h4>
        <p>
          Connect your Google Photos to browse and select photos directly from your library.
          You'll be redirected to Google to authorize access, then returned here.
        </p>
        <Button variant="primary" size="sm" onClick={connectGooglePhotos}>
          <GoogleOutlined /> Connect Google Photos
        </Button>
      </div>
    );
  }

  if (state.kind === 'connecting') {
    return (
      <div className="google-photos-status">
        <LoadingSpinner />
        <p>Redirecting to Google for authorization…</p>
      </div>
    );
  }

  if (state.kind === 'loading-photos') {
    return (
      <div className="google-photos-status">
        <LoadingSpinner />
        <p>Loading your photos…</p>
      </div>
    );
  }

  if (state.kind === 'no-photos') {
    return (
      <div className="google-photos-status">
        <EmptyState
          title="No photos found"
          description="Your Google Photos library doesn't have any photos yet."
        />
        <Button variant="secondary" size="sm" onClick={fetchPhotos} style={{ marginTop: 12 }}>
          <ReloadOutlined /> Refresh
        </Button>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="google-photos-status google-photos-error">
        <WarningOutlined className="google-photos-icon" />
        <h4>Something went wrong</h4>
        <p>{state.message}</p>
        {errorDetails && <pre className="google-photos-error-details">{errorDetails}</pre>}
        <div className="google-photos-actions">
          <Button variant="secondary" size="sm" onClick={checkConnection}>
            <ReloadOutlined /> Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={connectGooglePhotos}>
            Reconnect
          </Button>
        </div>
      </div>
    );
  }

  if (state.kind === 'downloading') {
    return (
      <div className="google-photos-status">
        <LoadingSpinner />
        <p>
          Downloading photos… {state.current} / {state.total}
        </p>
      </div>
    );
  }

  // Browsing state
  const selectedCount = state.selectedIds.size;

  return (
    <div className="google-photos-browser">
      <div className="google-photos-toolbar">
        <span className="google-photos-selected-count">
          {selectedCount > 0
            ? `${selectedCount} of ${maxPhotos} selected`
            : 'Select photos to add'}
        </span>
        <div className="google-photos-toolbar-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPhotos}
          >
            <ReloadOutlined /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={selectedCount === 0}
            onClick={downloadAndUpload}
          >
            <CheckOutlined /> Add {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </div>
      </div>

      <div className="google-photos-grid">
        {state.photos.map((photo) => {
          const isSelected = state.selectedIds.has(photo.id);
          const thumbnailUrl = `${photo.baseUrl}=w200-h200-c`;

          return (
            <button
              key={photo.id}
              type="button"
              className={`google-photos-item ${isSelected ? 'google-photos-item--selected' : ''}`}
              onClick={() => toggleSelection(photo.id)}
              aria-label={photo.filename}
              aria-selected={isSelected}
            >
              <img
                src={thumbnailUrl}
                alt={photo.filename}
                className="google-photos-thumb"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              {isSelected && (
                <span className="google-photos-checkmark">
                  <CheckOutlined />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
