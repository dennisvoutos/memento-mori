import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Textarea } from '../../components/ui/Input';
import { Input } from '../../components/ui/Input';
import { CandleButton } from '../../components/CandleButton';
import { Timeline } from '../../components/Timeline';
import { MemoryCard } from '../../components/MemoryCard';
import { Modal, Spin } from 'antd';
import { EditOutlined, HeartOutlined, SendOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import type { LifeMoment, Memory, VisitorInteraction } from '@memento-mori/shared';
import './MemorialPage.css';

type Tab = 'story' | 'memories' | 'timeline' | 'tributes';

export function MemorialPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { currentMemorial, isLoading, error, fetchMemorial, clearCurrent } =
    useMemorialStore();

  const [activeTab, setActiveTab] = useState<Tab>('story');
  const [lifeMoments, setLifeMoments] = useState<LifeMoment[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [interactions, setInteractions] = useState<VisitorInteraction[]>([]);
  const [stats, setStats] = useState<{ candles: number; messages: number; reactions: number } | null>(null);
  const [showTributeModal, setShowTributeModal] = useState(false);
  const [tributeText, setTributeText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwner = isAuthenticated && currentMemorial?.ownerId === user?.id;

  useEffect(() => {
    if (id) fetchMemorial(id);
    return () => clearCurrent();
  }, [id, fetchMemorial, clearCurrent]);

  /* Load tab data */
  useEffect(() => {
    if (!id) return;

    const loadTabData = async () => {
      try {
        if (activeTab === 'timeline') {
          const data = await api.lifeMoments.list(id);
          setLifeMoments(data);
        } else if (activeTab === 'memories') {
          const data = await api.memories.list(id);
          setMemories(data.items);
        } else if (activeTab === 'tributes') {
          const data = await api.interactions.list(id);
          setInteractions(data.items);
        }
      } catch {
        /* non‑critical */
      }
    };

    loadTabData();
  }, [id, activeTab]);

  /* Load stats on mount */
  useEffect(() => {
    if (!id) return;
    api.interactions.stats(id).then((s) => {
      setStats({
        candles: s.totalCandles,
        messages: s.totalMessages,
        reactions: 0,
      });
    }).catch(() => {});
  }, [id]);

  const handleLightCandle = async () => {
    if (!id) return;
    try {
      await api.interactions.create(id, { type: 'CANDLE' });
      setStats((s) =>
        s ? { ...s, candles: s.candles + 1 } : { candles: 1, messages: 0, reactions: 0 },
      );
    } catch {
      /* ignore */
    }
  };

  const handleSendTribute = async () => {
    if (!id || !tributeText.trim()) return;
    setSubmitting(true);
    try {
      const msg = await api.interactions.create(id, {
        type: 'MESSAGE',
        content: tributeText.trim(),
        authorName: authorName.trim() || undefined,
      } as any);
      setInteractions((prev) => [msg, ...prev]);
      setStats((s) =>
        s ? { ...s, messages: s.messages + 1 } : { candles: 0, messages: 1, reactions: 0 },
      );
      setTributeText('');
      setAuthorName('');
      setShowTributeModal(false);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="memorial-page-loading">
        <Spin size="large" />
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

  return (
    <div className="memorial-page">
      {/* ── Hero Banner ── */}
      <section className="memorial-hero">
        <div className="memorial-hero-inner">
          <Avatar
            src={m.profilePhotoUrl ?? undefined}
            name={m.fullName}
            size="xl"
          />
          <h1 className="memorial-name">{m.fullName}</h1>
          {(m.dateOfBirth || m.dateOfPassing) && (
            <p className="memorial-dates">
              {m.dateOfBirth
                ? format(new Date(m.dateOfBirth), 'MMMM d, yyyy')
                : ''}
              {m.dateOfBirth && m.dateOfPassing ? ' — ' : ''}
              {m.dateOfPassing
                ? format(new Date(m.dateOfPassing), 'MMMM d, yyyy')
                : ''}
            </p>
          )}

          <div className="memorial-hero-actions">
            <CandleButton
              count={stats?.candles ?? 0}
              onLight={handleLightCandle}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTributeModal(true)}
            >
              <HeartOutlined /> Leave a Tribute
            </Button>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/memorials/${m.id}/edit`)}
              >
                <EditOutlined /> Edit
              </Button>
            )}
          </div>

          {stats && (
            <div className="memorial-stats-row">
              <span>{stats.candles} candle{stats.candles !== 1 ? 's' : ''} lit</span>
              <span>·</span>
              <span>{stats.messages} tribute{stats.messages !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Tabs ── */}
      <nav className="memorial-tabs">
        {(['story', 'memories', 'timeline', 'tributes'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`memorial-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {/* ── Tab Content ── */}
      <section className="memorial-content">
        {activeTab === 'story' && (
          <div className="memorial-story">
            {m.biography ? (
              <Card>
                <p className="biography-text">{m.biography}</p>
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
          <div className="memorial-timeline">
            {lifeMoments.length > 0 ? (
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

        {activeTab === 'memories' && (
          <div className="memorial-memories">
            {memories?.length > 0 ? (
              <div className="memories-grid">
                {memories.map((mem) => (
                  <MemoryCard
                    key={mem.id}
                    type={mem.type as any}
                    content={mem.content ?? undefined}
                    mediaUrl={mem.mediaUrl ?? undefined}
                    authorName={mem.authorId ?? 'Anonymous'}
                    createdAt={mem.createdAt}
                    canDelete={isOwner}
                    onDelete={async () => {
                      if (!id) return;
                      try {
                        await api.memories.delete(id, mem.id);
                        setMemories((prev) => prev.filter((x) => x.id !== mem.id));
                      } catch {
                        /* non-critical */
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No memories yet"
                description="Be the first to share a memory."
              />
            )}
          </div>
        )}

        {activeTab === 'tributes' && (
          <div className="memorial-tributes">
            {interactions?.length > 0 ? (
              <div className="tributes-list">
                {interactions.map((i) => (
                  <Card key={i.id} className="tribute-card">
                    {i.type === 'CANDLE' && (
                      <p className="tribute-candle">🕯️ A candle was lit</p>
                    )}
                    {i.type === 'MESSAGE' && (
                      <p className="tribute-message">{i.content}</p>
                    )}
                    {i.type === 'REACTION' && (
                      <p className="tribute-reaction">
                        Reacted with {i.content}
                      </p>
                    )}
                    <span className="tribute-meta">
                      Anonymous ·{' '}
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
      </section>

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
    </div>
  );
}
