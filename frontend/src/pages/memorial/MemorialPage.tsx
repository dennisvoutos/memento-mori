import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { useAuthStore } from '../../stores/authStore';
import { api, ApiClientError } from '../../services/api';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Textarea, Input } from '../../components/ui/Input';
import { FileUpload } from '../../components/ui/FileUpload';
import { CandleButton } from '../../components/CandleButton';
import { Timeline } from '../../components/Timeline';
import { MemoryCard } from '../../components/MemoryCard';
import { useAppNotifications } from '../../lib/notifications';
import { GoogleAd } from '../../components/ui/GoogleAd';
import { SLOT_MEMORIAL_SIDEBAR } from '../../lib/adsense';
import { Modal, Skeleton, message } from 'antd';
import { EditOutlined, ExclamationCircleOutlined, HeartOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import type { LifeMoment, Memory, VisitorInteraction, MemoryType } from '@memento-mori/shared';
import './MemorialPage.css';

const TAB_LABELS: Record<Tab, string> = {
  story: 'About',
  timeline: 'Timeline',
  photos: 'Gallery',
  tributes: 'Tributes',
};

type Tab = 'story' | 'photos' | 'timeline' | 'tributes';

export function MemorialPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');
  const { user, isAuthenticated } = useAuthStore();
  const { currentMemorial, isLoading, error, fetchMemorial, fetchMemorialByToken, clearCurrent } =
    useMemorialStore();

  const [activeTab, setActiveTab] = useState<Tab>('story');
  const [lifeMoments, setLifeMoments] = useState<LifeMoment[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [interactions, setInteractions] = useState<VisitorInteraction[]>([]);
  const [stats, setStats] = useState<{ candles: number; messages: number; reactions: number } | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [tributesLoading, setTributesLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showTributeModal, setShowTributeModal] = useState(false);
  const [showAuthPromptModal, setShowAuthPromptModal] = useState(false);
  const [tributeText, setTributeText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* photo upload modal */
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoContent, setPhotoContent] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const notifications = useAppNotifications();

  const isOwner = isAuthenticated && currentMemorial?.ownerId === user?.id;

  /* Memoize photo‑type memories to avoid re‑filtering on every render */
  const photoMemories = useMemo(
    () => memories.filter((mem) => mem.type === 'PHOTO'),
    [memories],
  );

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  useEffect(() => {
    if (id) {
      if (shareToken) {
        fetchMemorialByToken(shareToken);
      } else {
        fetchMemorial(id);
      }
    }
    return () => clearCurrent();
  }, [id, shareToken, fetchMemorial, fetchMemorialByToken, clearCurrent]);

  /* Load tab data */
  useEffect(() => {
    if (!id) return;

    const loadTabData = async () => {
      try {
        if (activeTab === 'timeline') {
          setTimelineLoading(true);
          const data = await api.lifeMoments.list(id);
          setLifeMoments(data);
        } else if (activeTab === 'photos') {
          setPhotosLoading(true);
          const data = await api.memories.list(id);
          setMemories(data.items);
        } else if (activeTab === 'tributes') {
          setTributesLoading(true);
          const data = await api.interactions.list(id);
          setInteractions(data.items);
        }
      } catch {
        /* non‑critical */
      } finally {
        if (activeTab === 'timeline') setTimelineLoading(false);
        if (activeTab === 'photos') setPhotosLoading(false);
        if (activeTab === 'tributes') setTributesLoading(false);
      }
    };

    loadTabData();
  }, [id, activeTab]);

  /* Load stats on mount */
  useEffect(() => {
    if (!id) return;
    setStatsLoading(true);
    api.interactions.stats(id).then((s) => {
      setStats({
        candles: s.totalCandles,
        messages: s.totalMessages,
        reactions: 0,
      });
    }).catch(() => { /* stats are non-critical */ }).finally(() => setStatsLoading(false));
  }, [id]);

  const handleLightCandle = async () => {
    if (!id) return false;
    if (!isAuthenticated) {
      setShowAuthPromptModal(true);
      return false;
    }

    try {
      await api.interactions.create(id, { type: 'CANDLE' });
      setStats((s) =>
        s ? { ...s, candles: s.candles + 1 } : { candles: 1, messages: 0, reactions: 0 },
      );
      notifications.candleLit(currentMemorial?.fullName);
      return true;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setShowAuthPromptModal(true);
        return false;
      }

      return false;
    }
  };

  const handleSendTribute = async () => {
    if (!id || !tributeText.trim()) return;
    setSubmitting(true);
    try {
      const msg = await api.interactions.create(id, {
        type: 'MESSAGE',
        content: tributeText.trim(),
      });
      setInteractions((prev) => [msg, ...prev]);
      setStats((s) =>
        s ? { ...s, messages: s.messages + 1 } : { candles: 0, messages: 1, reactions: 0 },
      );
      setTributeText('');
      setAuthorName('');
      setShowTributeModal(false);
      notifications.tributeShared(currentMemorial?.fullName);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = useCallback(async () => {
    if (!id || !photoFile) return;
    setUploadingPhoto(true);
    try {
      const newMemory = await api.memories.upload(
        id,
        photoFile,
        photoCaption.trim() || undefined,
        photoContent.trim() || undefined,
        shareToken || undefined,
      );
      setMemories((prev) => [newMemory, ...prev]);
      setPhotoFile(null);
      setPhotoCaption('');
      setPhotoContent('');
      setShowPhotoModal(false);
      notifications.photoUploaded(currentMemorial?.fullName);
    } catch {
    } finally {
      setUploadingPhoto(false);
    }
  }, [id, photoFile, photoCaption, photoContent, shareToken, currentMemorial?.fullName, notifications]);

  const handleDeletePhoto = useCallback((memory: Memory) => {
    if (!id) return;

    const isVisitorUpload = Boolean(memory.authorId && memory.authorId !== user?.id);

    Modal.confirm({
      title: 'Remove this photo from the gallery?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Remove Photo',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      content: isVisitorUpload
        ? 'This visitor upload will be removed from the memorial gallery and its stored files will be deleted.'
        : 'This photo will be removed from the memorial gallery and its stored files will be deleted.',
      async onOk() {
        try {
          await api.memories.delete(id, memory.id);
          setMemories((prev) => prev.filter((item) => item.id !== memory.id));
          message.success('Photo removed');
        } catch {
          message.error('Failed to delete photo');
          throw new Error('Failed to delete photo');
        }
      },
    });
  }, [id, user?.id]);

  if (isLoading) {
    return (
      <div className="memorial-page-loading">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (error || !currentMemorial) {
    return (
      <div className="memorial-page-error">
        <EmptyState
          title="Memorial not found"
          description={error ?? 'This memorial may be private or may have been removed.'}
          action={{ label: 'Go Home', onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  const m = currentMemorial;
  const canUploadPhotos = Boolean(m.canUploadPhotos);

  return (
    <div className="mp">
      {/* ── Header Profile ── */}
      <section className="mp-header">
        <div className="mp-header-bg" />
        <div className="mp-header-content">
          <Avatar
            src={m.profilePhotoUrl ?? undefined}
            name={m.fullName}
            size="xxl"
          />
          <h1 className="mp-name">{m.fullName}</h1>
          {(m.dateOfBirth || m.dateOfPassing) && (
            <p className="mp-dates">
              {m.dateOfBirth
                ? format(new Date(m.dateOfBirth), 'MMMM d, yyyy')
                : ''}
              {m.dateOfBirth && m.dateOfPassing ? ' — ' : ''}
              {m.dateOfPassing
                ? format(new Date(m.dateOfPassing), 'MMMM d, yyyy')
                : ''}
            </p>
          )}
          {statsLoading ? (
            <div className="mp-stats-skeleton">
              <Skeleton active paragraph={{ rows: 1, width: ['60%'] }} title={false} />
            </div>
          ) : stats && (
            <div className="mp-stats-row">
              <span>{stats.candles} candle{stats.candles !== 1 ? 's' : ''} lit</span>
              <span className="mp-stats-dot">·</span>
              <span>{stats.messages} tribute{stats.messages !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Navigation Tabs ── */}
      <nav className="mp-tabs" role="tablist">
        {(['story', 'timeline', 'photos', 'tributes'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={activeTab === t}
            className={`mp-tab${activeTab === t ? ' mp-tab--active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {/* ── Two-Column Content ── */}
      <section className="mp-body">
        <div className="mp-main">
          {activeTab === 'story' && (
            <div className="mp-story">
              {m.biography ? (
                <Card>
                  <p className="mp-bio-text">{m.biography}</p>
                </Card>
              ) : (
                <EmptyState
                  title="No story yet"
                  description={
                    isOwner
                      ? 'Add a biography to tell their story.'
                      : 'The story has not been written yet.'
                  }
                  action={
                    isOwner ? { label: 'Edit Memorial', onClick: () => navigate(`/memorials/${m.id}/edit`) } : undefined
                  }
                />
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="mp-timeline">
              {timelineLoading ? (
                <div className="mp-section-loading">
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              ) : lifeMoments.length > 0 ? (
                <Timeline
                  items={lifeMoments.map((lm) => ({
                    id: lm.id,
                    date: lm.date ?? '',
                    title: lm.title,
                    description: lm.description ?? undefined,
                  }))}
                />
              ) : (
                <EmptyState
                  title="No life moments yet"
                  description={
                    isOwner
                      ? 'Add important milestones and moments.'
                      : 'No life moments have been shared yet.'
                  }
                  action={
                    isOwner ? { label: 'Edit Memorial', onClick: () => navigate(`/memorials/${m.id}/edit`) } : undefined
                  }
                />
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="mp-photos">
              {(isOwner || canUploadPhotos) && (
                <div className="mp-photos-toolbar">
                  {isOwner && (
                    <div className="mp-photos-owner-note">
                      <strong>Owner moderation:</strong> you can remove any gallery photo, including uploads from other people, if you need to handle spam or unwanted content.
                    </div>
                  )}
                  {canUploadPhotos && photoMemories.length !== 0 && (
                    <div className="mp-photos-bar">
                      <Button variant="secondary" size="sm" onClick={() => setShowPhotoModal(true)}>
                        <PlusOutlined /> Add Photo
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {photosLoading ? (
                <div className="mp-photos-grid">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index} className="mp-photo-skeleton-card">
                      <Skeleton.Image active style={{ width: '100%', height: 240 }} />
                      <Skeleton active title={false} paragraph={{ rows: 2 }} />
                    </Card>
                  ))}
                </div>
              ) : photoMemories.length > 0 ? (
                <div className="mp-photos-grid">
                  {photoMemories.map((mem) => (
                    <MemoryCard
                      key={mem.id}
                      type={mem.type as MemoryType}
                      content={mem.content ?? undefined}
                      mediaUrl={mem.mediaUrl ?? undefined}
                      caption={mem.caption ?? undefined}
                      authorName={mem.author?.displayName ?? 'Anonymous'}
                      createdAt={mem.createdAt}
                      canDelete={isOwner}
                      deleteLabel="Remove Photo"
                      onDelete={() => handleDeletePhoto(mem)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No photos yet"
                  description={
                    canUploadPhotos
                      ? 'Add photos to share memories and moments.'
                      : isOwner
                        ? 'Upload a photo, or enable gallery contributions if you want visitors to share their own.'
                        : 'No photos have been shared yet.'
                  }
                  action={
                    canUploadPhotos ? { label: 'Add Photo', onClick: () => setShowPhotoModal(true) } : undefined
                  }
                />
              )}
            </div>
          )}

          {activeTab === 'tributes' && (
            <div className="mp-tributes">
              {tributesLoading ? (
                <div className="mp-section-loading">
                  <Skeleton active paragraph={{ rows: 4 }} />
                </div>
              ) : interactions?.length > 0 ? (
                <div className="mp-tributes-list">
                  {interactions.map((i) => (
                    <Card key={i.id} className="mp-tribute-card">
                      {i.type === 'CANDLE' && (
                        <p className="mp-tribute-candle">🕯️ A candle was lit</p>
                      )}
                      {i.type === 'MESSAGE' && (
                        <p className="mp-tribute-message">{i.content}</p>
                      )}
                      {i.type === 'REACTION' && (
                        <p className="mp-tribute-reaction">
                          Reacted with {i.content}
                        </p>
                      )}
                      <span className="mp-tribute-meta">
                        {i.visitor?.displayName ?? 'Anonymous'} ·{' '}
                        {format(new Date(i.createdAt), 'MMM d, yyyy')}
                      </span>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No tributes yet"
                  description="Be the first to leave a tribute."
                  action={{ label: 'Leave a Tribute', onClick: () => setShowTributeModal(true) }}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Sticky Sidebar ── */}
        <aside className="mp-sidebar">
          <div className="mp-sidebar-inner">
            <h3 className="mp-sidebar-title">Actions</h3>
            <CandleButton
              count={stats?.candles ?? 0}
              onLight={handleLightCandle}
            />
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowTributeModal(true)}
              className="mp-sidebar-btn"
            >
              <HeartOutlined /> Share a Memory
            </Button>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/memorials/${m.id}/edit`)}
                className="mp-sidebar-btn"
              >
                <EditOutlined /> Edit Memorial
              </Button>
            )}

            {/* ── AD: sidebar ── */}
            <GoogleAd slotId={SLOT_MEMORIAL_SIDEBAR} />
          </div>
        </aside>
      </section>

      {/* ── Candle Auth Prompt Modal ── */}
      <Modal
        open={showAuthPromptModal}
        onCancel={() => setShowAuthPromptModal(false)}
        title="Log in to light a candle"
        footer={null}
        centered
      >
        <div className="tribute-form">
          <p>
            Lighting a candle is reserved for signed-in visitors. Log in or create an
            account to continue.
          </p>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowAuthPromptModal(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAuthPromptModal(false);
                navigate('/login', { state: { from: location } });
              }}
            >
              Log In
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowAuthPromptModal(false);
                navigate('/register', { state: { from: location } });
              }}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Tribute Modal ── */}
      <Modal
        open={showTributeModal}
        onCancel={() => setShowTributeModal(false)}
        title="Leave a Tribute"
        footer={null}
        centered
      >
        <div className="tribute-form">
          <Input
            label="Your name (optional)"
            placeholder="Anonymous"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
          <Textarea
            label="Your message"
            placeholder="Share a memory, a kind word, or simply say you remember…"
            value={tributeText}
            onChange={(e) => setTributeText(e.target.value)}
            rows={4}
            required
          />
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowTributeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={submitting}
              onClick={handleSendTribute}
              disabled={!tributeText.trim()}
            >
              <SendOutlined /> Send Tribute
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Photo Upload Modal ── */}
      <Modal
        open={showPhotoModal}
        onCancel={() => { setShowPhotoModal(false); setPhotoFile(null); setPhotoCaption(''); setPhotoContent(''); }}
        title="Add a Photo"
        footer={null}
        centered
        destroyOnHidden
      >
        <div className="tribute-form">
          <FileUpload
            accept="image/jpeg,image/png,image/webp"
            maxSizeMB={5}
            onFileSelect={setPhotoFile}
            preview={photoPreview}
            showPreviewActions={Boolean(photoFile)}
            onClear={() => setPhotoFile(null)}
            replaceLabel="Replace Photo"
            clearLabel="Delete Preview"
            label="Choose a photo (JPEG, PNG, WebP, max 5 MB)"
          />
          <Input
            label="Caption (optional)"
            placeholder="e.g. Summer at the lake, 1998"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
          />
          <Textarea
            label="Description (optional)"
            placeholder="Tell the story behind this photo…"
            value={photoContent}
            onChange={(e) => setPhotoContent(e.target.value)}
            rows={3}
          />
          <div className="form-actions">
            <Button variant="ghost" onClick={() => { setShowPhotoModal(false); setPhotoFile(null); setPhotoCaption(''); setPhotoContent(''); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={uploadingPhoto}
              disabled={!photoFile}
              onClick={handlePhotoUpload}
            >
              <PlusOutlined /> Upload Photo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
