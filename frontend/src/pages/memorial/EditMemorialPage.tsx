import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/FileUpload';
import { PrivacySelector } from '../../components/PrivacySelector';
import { format } from 'date-fns';
import type { LifeMoment } from '@memento-mori/shared';
import './EditMemorialPage.css';

export function EditMemorialPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentMemorial, isLoading, error, fetchMemorial, updateMemorial, deleteMemorial, clearCurrent } =
    useMemorialStore();

  /* form state */
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    dateOfPassing: '',
    biography: '',
    privacyLevel: 'PRIVATE',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  /* life moments */
  const [lifeMoments, setLifeMoments] = useState<LifeMoment[]>([]);
  const [showMomentModal, setShowMomentModal] = useState(false);
  const [momentForm, setMomentForm] = useState({ title: '', date: '', description: '' });
  const [addingMoment, setAddingMoment] = useState(false);

  /* photo */
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  /* share link */
  const [shareLink, setShareLink] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  /* danger */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) fetchMemorial(id);
    return () => clearCurrent();
  }, [id, fetchMemorial, clearCurrent]);

  /* Populate form when memorial loads */
  useEffect(() => {
    if (!currentMemorial) return;
    const m = currentMemorial;
    setForm({
      fullName: m.fullName,
      dateOfBirth: m.dateOfBirth ? m.dateOfBirth.split('T')[0] : '',
      dateOfPassing: m.dateOfPassing ? m.dateOfPassing.split('T')[0] : '',
      biography: m.biography || '',
      privacyLevel: m.privacyLevel,
    });

    /* load life moments */
    if (id) {
      api.lifeMoments.list(id).then(setLifeMoments).catch(() => {});
    }
  }, [currentMemorial, id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const payload: Record<string, string> = {};
      payload.fullName = form.fullName;
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.dateOfPassing) payload.dateOfPassing = form.dateOfPassing;
      if (form.biography.trim()) payload.biography = form.biography.trim();
      payload.privacyLevel = form.privacyLevel;
      await updateMemorial(id, payload as any);
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!id || !photoFile) return;
    setUploadingPhoto(true);
    try {
      await api.memorials.uploadPhoto(id, photoFile);
      await fetchMemorial(id);
      setPhotoFile(null);
    } catch {
      /* ignore */
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddMoment = async () => {
    if (!id || !momentForm.title.trim()) return;
    setAddingMoment(true);
    try {
      const payload: Record<string, string> = { title: momentForm.title };
      if (momentForm.date) payload.date = momentForm.date;
      if (momentForm.description.trim()) payload.description = momentForm.description.trim();
      const newMoment = await api.lifeMoments.create(id, payload as any);
      setLifeMoments((prev) => [...prev, newMoment]);
      setMomentForm({ title: '', date: '', description: '' });
      setShowMomentModal(false);
    } catch {
      /* ignore */
    } finally {
      setAddingMoment(false);
    }
  };

  const handleDeleteMoment = async (momentId: string) => {
    if (!id) return;
    try {
      await api.lifeMoments.delete(id, momentId);
      setLifeMoments((prev) => prev.filter((lm) => lm.id !== momentId));
    } catch {
      /* ignore */
    }
  };

  const handleShareLink = async () => {
    if (!id) return;
    try {
      const data = await api.memorials.generateShareLink(id);
      const link = `${window.location.origin}/memorials/shared/${data.accessToken}`;
      setShareLink(link);
    } catch {
      /* ignore */
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopyMsg('Copied!');
    setTimeout(() => setCopyMsg(''), 2000);
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteMemorial(id);
      navigate('/dashboard');
    } catch {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="edit-loading">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !currentMemorial) {
    return (
      <div className="edit-error">
        <EmptyState
          title="Memorial not found"
          description={error ?? 'Could not load this memorial.'}
          action={{ label: 'Dashboard', onClick: () => navigate('/dashboard') }}
        />
      </div>
    );
  }

  return (
    <div className="edit-memorial-page">
      <div className="edit-header">
        <h1>Edit Memorial</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/memorials/${id}`)}>
          View Page
        </Button>
      </div>

      {/* ── Details ── */}
      <Card className="edit-section">
        <h2 className="section-label">Details</h2>
        <div className="edit-form">
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
          />
          <div className="form-row">
            <Input
              label="Date of Birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
            <Input
              label="Date of Passing"
              type="date"
              value={form.dateOfPassing}
              onChange={(e) => setForm((f) => ({ ...f, dateOfPassing: e.target.value }))}
            />
          </div>
          <Textarea
            label="Biography"
            value={form.biography}
            onChange={(e) => setForm((f) => ({ ...f, biography: e.target.value }))}
            rows={6}
          />
          <PrivacySelector
            value={form.privacyLevel as any}
            onChange={(v) => setForm((f) => ({ ...f, privacyLevel: v }))}
          />
          <div className="form-actions">
            <span className="save-msg">{saveMsg}</span>
            <Button variant="primary" isLoading={saving} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Profile Photo ── */}
      <Card className="edit-section">
        <h2 className="section-label">Profile Photo</h2>
        <FileUpload
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={5}
          onFileSelect={setPhotoFile}
          label="Upload a photo (JPEG, PNG, WebP, max 5 MB)"
        />
        {photoFile && (
          <div className="form-actions">
            <Button
              variant="primary"
              size="sm"
              isLoading={uploadingPhoto}
              onClick={handlePhotoUpload}
            >
              Upload Photo
            </Button>
          </div>
        )}
      </Card>

      {/* ── Life Moments ── */}
      <Card className="edit-section">
        <div className="section-header">
          <h2 className="section-label">Life Moments</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowMomentModal(true)}>
            + Add Moment
          </Button>
        </div>
        {lifeMoments.length > 0 ? (
          <div className="moments-list">
            {lifeMoments.map((lm) => (
              <div className="moment-item" key={lm.id}>
                <div>
                  <strong>{lm.title}</strong>
                  {lm.date && (
                    <span className="moment-date">
                      {' '}— {format(new Date(lm.date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {lm.description && <p className="moment-desc">{lm.description}</p>}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteMoment(lm.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-hint">No life moments added yet.</p>
        )}
      </Card>

      {/* ── Share Link ── */}
      <Card className="edit-section">
        <h2 className="section-label">Share Link</h2>
        <p className="help-text">
          Generate a private share link for this memorial.
        </p>
        {shareLink ? (
          <div className="share-link-row">
            <code className="share-link">{shareLink}</code>
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              {copyMsg || 'Copy'}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleShareLink}>
            Generate Link
          </Button>
        )}
      </Card>

      {/* ── Danger Zone ── */}
      <Card className="edit-section danger-zone">
        <h2 className="section-label danger">Danger Zone</h2>
        <p className="help-text">
          Permanently delete this memorial and all its content. This action cannot
          be undone.
        </p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
          Delete Memorial
        </Button>
      </Card>

      {/* ── Add Moment Modal ── */}
      <Modal
        isOpen={showMomentModal}
        onClose={() => setShowMomentModal(false)}
        title="Add Life Moment"
      >
        <div className="tribute-form">
          <Input
            label="Title *"
            placeholder="e.g. Graduated from University"
            value={momentForm.title}
            onChange={(e) =>
              setMomentForm((f) => ({ ...f, title: e.target.value }))
            }
            required
          />
          <Input
            label="Date"
            type="date"
            value={momentForm.date}
            onChange={(e) =>
              setMomentForm((f) => ({ ...f, date: e.target.value }))
            }
          />
          <Textarea
            label="Description"
            placeholder="Tell us more about this moment…"
            value={momentForm.description}
            onChange={(e) =>
              setMomentForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
          />
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowMomentModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={addingMoment}
              onClick={handleAddMoment}
              disabled={!momentForm.title.trim()}
            >
              Add Moment
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
      >
        <p style={{ marginBottom: 16, color: 'var(--color-text-light)' }}>
          Are you sure you want to permanently delete the memorial for{' '}
          <strong>{currentMemorial.fullName}</strong>? This cannot be undone.
        </p>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
            Delete Forever
          </Button>
        </div>
      </Modal>
    </div>
  );
}
