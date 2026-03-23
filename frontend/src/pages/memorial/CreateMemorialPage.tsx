import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { api } from '../../services/api';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PrivacySelector } from '../../components/PrivacySelector';
import { createMemorialSchema } from '@memento-mori/shared';
import type { PrivacyLevel } from '@memento-mori/shared';
import { extractZodErrors } from '../../lib/validation';
import { CATEGORY_OPTIONS } from '../../lib/categories';
import { Select, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { CloudUploadOutlined, CheckOutlined } from '@ant-design/icons';
import './CreateMemorialPage.css';

const STEPS = [
  { num: 1, label: 'Basic Info' },
  { num: 2, label: 'Story' },
  { num: 3, label: 'Photos' },
  { num: 4, label: 'Privacy' },
];

export function CreateMemorialPage() {
  const navigate = useNavigate();
  const { createMemorial, isLoading } = useMemorialStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    dateOfPassing: '',
    biography: '',
    privacyLevel: 'PRIVATE' as string,
    category: 'OTHER' as string,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Photo handlers ── */
  const handlePhotoSelect = useCallback((file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      message.error('Unsupported format. Please use JPEG, PNG, or WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('File is too large. Maximum size is 5 MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handlePhotoSelect(file);
    },
    [handlePhotoSelect],
  );

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
      category?: string;
    } = { fullName: form.fullName };
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.dateOfPassing) payload.dateOfPassing = form.dateOfPassing;
    if (form.biography.trim()) payload.biography = form.biography.trim();
    if (form.privacyLevel) payload.privacyLevel = form.privacyLevel as PrivacyLevel;
    if (form.category) payload.category = form.category;

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
      // Upload photo if one was selected
      if (photoFile) {
        try {
          await api.memorials.uploadPhoto(m.id, photoFile);
        } catch {
          /* non-critical – memorial is created */
        }
      }
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
              <div
                className={`cm-upload-zone${photoPreview ? ' cm-upload-zone--has-photo' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="cm-upload-preview" />
                ) : (
                  <div className="cm-upload-placeholder">
                    <CloudUploadOutlined className="cm-upload-icon" />
                    <span className="cm-upload-title">Upload Primary Portrait</span>
                    <span className="cm-upload-hint">
                      Drag and drop a photo here or click to select.
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="cm-upload-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                  }}
                />
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
          <div className="cm-single-col">
            <p className="cm-step-desc">
              You can add additional photos after creating the memorial. The primary portrait
              chosen in Step 1 will be used as the profile photo.
            </p>
            {photoPreview && (
              <div className="cm-photo-preview-wrap">
                <img src={photoPreview} alt="Primary portrait" className="cm-photo-preview-thumb" />
                <span className="cm-photo-preview-label">Primary Portrait</span>
              </div>
            )}
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

            <fieldset className="cm-fieldset">
              <legend className="cm-legend">Category</legend>
              <div className="input-group">
                <label className="input-label">Memorial Category</label>
                <Select
                  value={form.category}
                  onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  options={CATEGORY_OPTIONS}
                  style={{ width: '100%' }}
                />
              </div>
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
