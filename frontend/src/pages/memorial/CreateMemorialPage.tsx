import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { api } from '../../services/api';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PrivacySelector } from '../../components/PrivacySelector';
import { createMemorialSchema } from '@memento-mori/shared';
import type { PrivacyLevel } from '@memento-mori/shared';
import { extractZodErrors } from '../../lib/validation';
import { useAppNotifications } from '../../lib/notifications';
import { DatePicker, Switch, message } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { CloudUploadOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import './CreateMemorialPage.css';

const STEPS = [
  { num: 1, label: 'Basic Info' },
  { num: 2, label: 'Story' },
  { num: 3, label: 'Photos' },
  { num: 4, label: 'Privacy' },
];

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY_PHOTOS = 50;
const MAX_CREATION_PHOTOS = MAX_GALLERY_PHOTOS + 1;
const CREATION_PHOTO_LIMIT_MESSAGE =
  'You can add up to 1 profile photo and 50 gallery photos during creation right now.';

interface DraftPhoto {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
}

function createDraftPhoto(file: File): DraftPhoto {
  const draftId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `draft-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id: draftId,
    file,
    previewUrl: URL.createObjectURL(file),
    isPrimary: false,
  };
}

function ensureSinglePrimary(photos: DraftPhoto[]): DraftPhoto[] {
  if (photos.length === 0) {
    return photos;
  }

  const primaryIndex = photos.findIndex((photo) => photo.isPrimary);
  const resolvedPrimaryIndex = primaryIndex === -1 ? 0 : primaryIndex;

  return photos.map((photo, index) => ({
    ...photo,
    isPrimary: index === resolvedPrimaryIndex,
  }));
}

function getPhotoValidationError(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Unsupported format. Please use JPEG, PNG, or WebP.';
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'File is too large. Maximum size is 5 MB.';
  }

  return null;
}

function formatPhotoSize(sizeInBytes: number): string {
  if (sizeInBytes >= 1024 * 1024) {
    const sizeInMb = sizeInBytes / (1024 * 1024);
    return `${sizeInMb >= 10 ? sizeInMb.toFixed(0) : sizeInMb.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
}

export function CreateMemorialPage() {
  const navigate = useNavigate();
  const { createMemorial, isLoading } = useMemorialStore();
  const notifications = useAppNotifications();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    dateOfPassing: '',
    biography: '',
    privacyLevel: 'PRIVATE' as string,
    allowPhotoUploads: false,
  });
  const [draftPhotos, setDraftPhotos] = useState<DraftPhoto[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotoDragActive, setIsPhotoDragActive] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const replacePhotoInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const primaryPhoto = draftPhotos.find((photo) => photo.isPrimary) ?? null;
  const galleryPhotos = draftPhotos.filter((photo) => !photo.isPrimary);

  useEffect(() => {
    previewUrlsRef.current = draftPhotos.map((photo) => photo.previewUrl);
  }, [draftPhotos]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, []);

  /* ── Photo handlers ── */
  const addPhotos = useCallback((files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const validFiles: File[] = [];

    files.forEach((file) => {
      const validationError = getPhotoValidationError(file);
      if (validationError) {
        message.error(`${file.name}: ${validationError}`);
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length === 0) {
      return;
    }

    setDraftPhotos((current) => {
      if (current.length >= MAX_CREATION_PHOTOS) {
        message.error(CREATION_PHOTO_LIMIT_MESSAGE);
        return current;
      }

      const remainingSlots = MAX_CREATION_PHOTOS - current.length;
      const filesToAdd = validFiles.slice(0, remainingSlots);

      if (filesToAdd.length < validFiles.length) {
        message.error(CREATION_PHOTO_LIMIT_MESSAGE);
      }

      return ensureSinglePrimary([
        ...current,
        ...filesToAdd.map((file) => createDraftPhoto(file)),
      ]);
    });
  }, []);

  const handleAddPhotosChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      addPhotos(files);
    },
    [addPhotos],
  );

  const handlePrimaryPhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';

      if (!file) {
        return;
      }

      const validationError = getPhotoValidationError(file);
      if (validationError) {
        message.error(validationError);
        return;
      }

      setDraftPhotos((current) => {
        const existingPrimary = current.find((photo) => photo.isPrimary) ?? null;

        if (!existingPrimary && current.length >= MAX_CREATION_PHOTOS) {
          message.error(CREATION_PHOTO_LIMIT_MESSAGE);
          return current;
        }

        if (existingPrimary) {
          URL.revokeObjectURL(existingPrimary.previewUrl);
        }

        return [
          {
            ...createDraftPhoto(file),
            isPrimary: true,
          },
          ...current.filter((photo) => !photo.isPrimary),
        ];
      });
    },
    [],
  );

  const handlePhotoDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsPhotoDragActive(false);
      addPhotos(Array.from(e.dataTransfer.files));
    },
    [addPhotos],
  );

  const handleReplacePhotoRequest = useCallback((photoId: string) => {
    setReplaceTargetId(photoId);
    replacePhotoInputRef.current?.click();
  }, []);

  const handleReplacePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';

      if (!replaceTargetId || !file) {
        return;
      }

      const validationError = getPhotoValidationError(file);
      if (validationError) {
        message.error(validationError);
        return;
      }

      setDraftPhotos((current) => ensureSinglePrimary(current.map((photo) => {
        if (photo.id !== replaceTargetId) {
          return photo;
        }

        URL.revokeObjectURL(photo.previewUrl);
        return {
          ...photo,
          file,
          previewUrl: URL.createObjectURL(file),
        };
      })));
      setReplaceTargetId(null);
    },
    [replaceTargetId],
  );

  const handleDeletePhoto = useCallback(
    (photoId: string) => {
      setDraftPhotos((current) => {
        const photoToDelete = current.find((photo) => photo.id === photoId);
        if (photoToDelete) {
          URL.revokeObjectURL(photoToDelete.previewUrl);
        }

        return ensureSinglePrimary(current.filter((photo) => photo.id !== photoId));
      });

      if (replaceTargetId === photoId) {
        setReplaceTargetId(null);
      }
    },
    [replaceTargetId],
  );

  const handleSetPrimaryPhoto = useCallback((photoId: string) => {
    setDraftPhotos((current) => current.map((photo) => ({
      ...photo,
      isPrimary: photo.id === photoId,
    })));
  }, []);

  /* ── Step validation ── */
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.dateOfBirth) errs.dateOfBirth = 'Date of birth is required.';
    if (!form.dateOfPassing) errs.dateOfPassing = 'Date of passing is required.';
    if (form.dateOfBirth && form.dateOfPassing && form.dateOfBirth > form.dateOfPassing)
      errs.dateOfPassing = 'Must be after date of birth.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setErrors({});
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  /* ── Final submit ── */
  const handleSubmit = async () => {
    setErrors({});
    setServerError('');

    const payload: {
      fullName: string;
      dateOfBirth?: string;
      dateOfPassing?: string;
      biography?: string;
      privacyLevel?: PrivacyLevel;
      allowPhotoUploads?: boolean;
    } = { fullName: form.fullName };
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.dateOfPassing) payload.dateOfPassing = form.dateOfPassing;
    if (form.biography.trim()) payload.biography = form.biography.trim();
    if (form.privacyLevel) payload.privacyLevel = form.privacyLevel as PrivacyLevel;
    payload.allowPhotoUploads = form.allowPhotoUploads;

    try {
      createMemorialSchema.parse(payload);
    } catch (err) {
      const fieldErrors = extractZodErrors(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
        // Jump back to the step that has the error
        const step1Fields = ['fullName', 'dateOfBirth', 'dateOfPassing'];
        if (Object.keys(fieldErrors).some((k) => step1Fields.includes(k))) {
          setStep(1);
        }
        return;
      }
      // Non-Zod error — rethrow
      throw err;
    }

    setIsSubmitting(true);
    try {
      const m = await createMemorial(payload);

      const uploadResults = await Promise.allSettled([
        ...(primaryPhoto ? [api.memorials.uploadPhoto(m.id, primaryPhoto.file)] : []),
        ...galleryPhotos.map((photo) => api.memorialImages.upload(m.id, photo.file)),
      ]);

      void uploadResults;

      notifications.memorialCreated(m.fullName);
      navigate(`/memorials/${m.id}`);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Failed to create memorial',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Stepper ── */
  const renderStepper = () => (
    <div className="cm-stepper">
      {STEPS.map((s, i) => (
        <div className="cm-step-wrapper" key={s.num}>
          {i > 0 && (
            <div className={`cm-step-line${step > s.num - 1 ? ' cm-step-line--done' : ''}`} />
          )}
          <button
            type="button"
            className={`cm-step-pill${step === s.num ? ' cm-step-pill--active' : ''}${step > s.num ? ' cm-step-pill--done' : ''}`}
            onClick={() => {
              if (s.num < step) setStep(s.num);
            }}
            disabled={s.num > step}
          >
            {step > s.num ? (
              <CheckOutlined className="cm-step-check" />
            ) : (
              <span className="cm-step-num">{s.num}</span>
            )}
            <span className="cm-step-label">{s.label}</span>
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="cm-page">
      <div className="cm-container">
        {/* ── Stepper Bar ── */}
        <div className="cm-stepper-bar">
          {renderStepper()}
        </div>

        {/* ── Title ── */}
        <h1 className="cm-title">Create a Memorial</h1>

        {serverError && <div className="cm-error">{serverError}</div>}

        {/* ═══════ STEP 1 — Basic Info ═══════ */}
        {step === 1 && (
          <div className="cm-split">
            <div className="cm-left">
              <Input
                label="Full Name"
                placeholder="e.g. Margaret Anne Ellis"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                error={errors.fullName}
                required
                autoFocus
              />

              <div className="cm-date-row">
                <div className="input-group">
                  <label className="input-label">Birth Date *</label>
                  <DatePicker
                    value={form.dateOfBirth ? dayjs(form.dateOfBirth) : null}
                    onChange={(date: Dayjs | null) =>
                      setForm((f) => ({ ...f, dateOfBirth: date ? date.format('YYYY-MM-DD') : '' }))
                    }
                    format="MMMM D, YYYY"
                    placeholder="Select date"
                    style={{ width: '100%' }}
                    status={errors.dateOfBirth ? 'error' : undefined}
                    disabledDate={(current) => {
                      if (current && current.isAfter(dayjs(), 'day')) return true;
                      if (current && form.dateOfPassing && current.isAfter(dayjs(form.dateOfPassing), 'day')) return true;
                      return false;
                    }}
                  />
                  {errors.dateOfBirth && <span className="input-error-text" role="alert">{errors.dateOfBirth}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label">Passing Date *</label>
                  <DatePicker
                    value={form.dateOfPassing ? dayjs(form.dateOfPassing) : null}
                    onChange={(date: Dayjs | null) =>
                      setForm((f) => ({ ...f, dateOfPassing: date ? date.format('YYYY-MM-DD') : '' }))
                    }
                    format="MMMM D, YYYY"
                    placeholder="Select date"
                    style={{ width: '100%' }}
                    status={errors.dateOfPassing ? 'error' : undefined}
                    disabledDate={(current) => {
                      if (current && current.isAfter(dayjs(), 'day')) return true;
                      if (current && form.dateOfBirth && current.isBefore(dayjs(form.dateOfBirth), 'day')) return true;
                      return false;
                    }}
                  />
                  {errors.dateOfPassing && <span className="input-error-text" role="alert">{errors.dateOfPassing}</span>}
                </div>
              </div>

              <Textarea
                label="Obituary"
                placeholder="Share who they were, what they loved, and the legacy they leave behind…"
                value={form.biography}
                onChange={(e) => setForm((f) => ({ ...f, biography: e.target.value }))}
                error={errors.biography}
                rows={5}
              />

              <button type="button" className="cm-btn-next" onClick={handleNext}>
                Next
              </button>
              <button
                type="button"
                className="cm-link-save"
                onClick={() => navigate('/dashboard')}
              >
                Discard &amp; Return to Dashboard
              </button>
            </div>

            <div className="cm-right">
              <div className="cm-profile-photo-panel">
                <div
                  className={`cm-upload-zone${primaryPhoto ? ' cm-upload-zone--has-photo' : ''}`}
                  onClick={() => profilePhotoInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      profilePhotoInputRef.current?.click();
                    }
                  }}
                  aria-label={primaryPhoto ? 'Replace profile photo' : 'Add profile photo'}
                >
                  {primaryPhoto ? (
                    <>
                      <img
                        src={primaryPhoto.previewUrl}
                        alt="Profile photo preview"
                        className="cm-upload-preview"
                      />
                      <div className="cm-upload-overlay">
                        <span className="cm-upload-overlay-title">{primaryPhoto.file.name}</span>
                        <span className="cm-upload-overlay-hint">
                          Click to replace the current profile photo
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="cm-upload-placeholder">
                      <CloudUploadOutlined className="cm-upload-icon" />
                      <span className="cm-upload-title">Add profile photo</span>
                      <span className="cm-upload-hint">
                        Choose the memorial&apos;s main portrait now. You can manage all photos in Step 3.
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={profilePhotoInputRef}
                  data-testid="create-memorial-primary-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="cm-upload-input"
                  onChange={handlePrimaryPhotoChange}
                />

                <aside className="cm-side-note" aria-labelledby="cm-photo-step-heading">
                  <span className="cm-side-note-eyebrow">Profile photo</span>
                  <h2 id="cm-photo-step-heading" className="cm-side-note-title">
                    Choose the memorial portrait now
                  </h2>
                  <p className="cm-side-note-text">
                    This image becomes the memorial&apos;s main photo. In Step 3 you can add gallery photos, replace drafts, delete photos, or switch which image is the profile photo before you create the memorial.
                  </p>
                  <p className="cm-side-note-status">
                    {primaryPhoto
                      ? `${primaryPhoto.file.name} is currently selected as the profile photo.`
                      : 'No profile photo selected yet.'}
                  </p>
                </aside>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ STEP 2 — Story ═══════ */}
        {step === 2 && (
          <div className="cm-single-col">
            <Textarea
              label="Tell their full story"
              placeholder="Write a detailed biography — milestones, personality, what made them special…"
              value={form.biography}
              onChange={(e) => setForm((f) => ({ ...f, biography: e.target.value }))}
              error={errors.biography}
              rows={12}
            />
            <div className="cm-step-actions">
              <Button type="button" variant="ghost" onClick={handleBack}>
                Back
              </Button>
              <button type="button" className="cm-btn-next cm-btn-next--inline" onClick={handleNext}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* ═══════ STEP 3 — Photos ═══════ */}
        {step === 3 && (
          <div className="cm-single-col cm-photo-step">
            <p className="cm-step-desc">
              Add the memorial&apos;s profile photo and any extra gallery photos now. The photo
              marked as profile will be used across the memorial, and the rest will be added to
              the gallery after the memorial is created.
            </p>
            <div className="cm-photo-toolbar">
              <div className="cm-photo-toolbar-copy">
                <span className="cm-photo-toolbar-count">
                  {draftPhotos.length === 0
                    ? 'No photos added yet'
                    : `${draftPhotos.length} photo${draftPhotos.length === 1 ? '' : 's'} ready to upload`}
                </span>
                <span className="cm-photo-toolbar-note">
                  Drag photos from your computer or click to browse. Right now you can add the
                  profile photo plus up to {MAX_GALLERY_PHOTOS} gallery photos during creation.
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => addPhotoInputRef.current?.click()}
              >
                <PlusOutlined /> {draftPhotos.length > 0 ? 'Add More Photos' : 'Add Photos'}
              </Button>
            </div>

            <div
              className={`cm-gallery-dropzone${isPhotoDragActive ? ' cm-gallery-dropzone--dragging' : ''}`}
              onClick={() => addPhotoInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsPhotoDragActive(true);
              }}
              onDragLeave={() => setIsPhotoDragActive(false)}
              onDrop={handlePhotoDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  addPhotoInputRef.current?.click();
                }
              }}
            >
              <CloudUploadOutlined className="cm-gallery-dropzone-icon" />
              <span className="cm-gallery-dropzone-title">Drop photos here or click to browse</span>
              <span className="cm-gallery-dropzone-hint">
                Add multiple photos now, then replace or delete any draft before you create the memorial.
              </span>
            </div>
            <input
              ref={addPhotoInputRef}
              data-testid="create-memorial-photo-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="cm-upload-input"
              onChange={handleAddPhotosChange}
            />
            <input
              ref={replacePhotoInputRef}
              data-testid="create-memorial-replace-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="cm-upload-input"
              onChange={handleReplacePhotoChange}
            />

            {primaryPhoto && (
              <div className="cm-primary-photo-summary">
                <img
                  src={primaryPhoto.previewUrl}
                  alt="Current profile photo"
                  className="cm-primary-photo-summary-image"
                />
                <div className="cm-primary-photo-summary-copy">
                  <span className="cm-primary-photo-summary-label">Current profile photo</span>
                  <span className="cm-primary-photo-summary-name">{primaryPhoto.file.name}</span>
                </div>
              </div>
            )}

            {draftPhotos.length > 0 && (
              <div className="cm-photo-grid">
                {draftPhotos.map((photo) => (
                  <article
                    key={photo.id}
                    className={`cm-photo-card${photo.isPrimary ? ' cm-photo-card--primary' : ''}`}
                  >
                    <div className="cm-photo-card-media">
                      <img
                        src={photo.previewUrl}
                        alt={`${photo.file.name} preview`}
                        className="cm-photo-card-image"
                      />
                    </div>
                    <div className="cm-photo-card-body">
                      <div className="cm-photo-card-header">
                        <div className="cm-photo-card-copy">
                          <span className="cm-photo-card-name">{photo.file.name}</span>
                          <span className="cm-photo-card-meta">{formatPhotoSize(photo.file.size)}</span>
                        </div>
                        {photo.isPrimary ? (
                          <span className="cm-photo-card-badge">Profile photo</span>
                        ) : (
                          <button
                            type="button"
                            className="cm-photo-card-link"
                            onClick={() => handleSetPrimaryPhoto(photo.id)}
                          >
                            Make Profile Photo
                          </button>
                        )}
                      </div>
                      <div className="cm-photo-card-actions">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleReplacePhotoRequest(photo.id)}
                        >
                          Replace
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="cm-photo-card-delete"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div
              className="cm-photo-sharing-card"
              role="group"
              aria-labelledby="cm-photo-sharing-title"
            >
              <div className="cm-photo-sharing-copy">
                <span className="cm-photo-sharing-eyebrow">Gallery contributions</span>
                <div className="cm-photo-sharing-header">
                  <h2 id="cm-photo-sharing-title" className="cm-photo-sharing-title">
                    Allow logged-in visitors to add gallery photos
                  </h2>
                  <span
                    className={`cm-photo-sharing-status${form.allowPhotoUploads ? ' cm-photo-sharing-status--enabled' : ''}`}
                  >
                    {form.allowPhotoUploads ? 'Enabled' : 'Owner only'}
                  </span>
                </div>
                <p className="cm-photo-sharing-text">
                  When enabled, any logged-in person who can view this memorial can upload photos to the gallery.
                </p>
                <p className="cm-photo-sharing-note">
                  You can remove contributed photos later if you need to moderate spam or unwanted uploads.
                </p>
              </div>
              <Switch
                id="create-allow-photo-uploads"
                checked={form.allowPhotoUploads}
                onChange={(checked) => setForm((f) => ({ ...f, allowPhotoUploads: checked }))}
                aria-labelledby="cm-photo-sharing-title"
              />
            </div>
            <div className="cm-step-actions">
              <Button type="button" variant="ghost" onClick={handleBack}>
                Back
              </Button>
              <button type="button" className="cm-btn-next cm-btn-next--inline" onClick={handleNext}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* ═══════ STEP 4 — Privacy ═══════ */}
        {step === 4 && (
          <div className="cm-single-col">
            <fieldset className="cm-fieldset">
              <legend className="cm-legend">Privacy</legend>
              <PrivacySelector
                value={form.privacyLevel}
                onChange={(v) => setForm((f) => ({ ...f, privacyLevel: v }))}
              />
            </fieldset>

            <div className="cm-step-actions">
              <Button type="button" variant="ghost" onClick={handleBack}>
                Back
              </Button>
              <button
                type="button"
                className="cm-btn-next cm-btn-submit"
                disabled={isLoading || isSubmitting}
                onClick={handleSubmit}
              >
                {isLoading || isSubmitting ? 'Creating…' : 'Create Memorial'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
