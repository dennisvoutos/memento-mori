import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemorialStore } from '../../stores/memorialStore';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PrivacySelector } from '../../components/PrivacySelector';
import { createMemorialSchema, MemorialCategory } from '@memento-mori/shared';
import type { core } from 'zod';
import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import './CreateMemorialPage.css';

const CATEGORY_OPTIONS = [
  { value: MemorialCategory.HEART_DISEASE, label: 'Heart Disease' },
  { value: MemorialCategory.CANCER, label: 'Cancer' },
  { value: MemorialCategory.COVID_19, label: 'COVID-19' },
  { value: MemorialCategory.ACCIDENT, label: 'Accident' },
  { value: MemorialCategory.STROKE, label: 'Stroke' },
  { value: MemorialCategory.RESPIRATORY_DISEASE, label: 'Respiratory Disease' },
  { value: MemorialCategory.ALZHEIMERS_DEMENTIA, label: 'Alzheimer\'s / Dementia' },
  { value: MemorialCategory.DIABETES, label: 'Diabetes' },
  { value: MemorialCategory.SUICIDE, label: 'Suicide' },
  { value: MemorialCategory.KIDNEY_DISEASE, label: 'Kidney Disease' },
  { value: MemorialCategory.OTHER, label: 'Other' },
];

export function CreateMemorialPage() {
  const navigate = useNavigate();
  const { createMemorial, isLoading } = useMemorialStore();
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    dateOfPassing: '',
    biography: '',
    privacyLevel: 'PRIVATE' as string,
    category: 'OTHER' as string,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    /* build payload — omit empty optional strings */
    const payload: Record<string, string> = { fullName: form.fullName };
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.dateOfPassing) payload.dateOfPassing = form.dateOfPassing;
    if (form.biography.trim()) payload.biography = form.biography.trim();
    if (form.privacyLevel) payload.privacyLevel = form.privacyLevel;
    if (form.category) payload.category = form.category;

    try {
      createMemorialSchema.parse(payload);
    } catch (err) {
      const zodError = err as { issues: core.$ZodIssue[] };
      const fieldErrors: Record<string, string> = {};
      zodError.issues.forEach((issue: core.$ZodIssue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const m = await createMemorial(payload as any);
      navigate(`/memorials/${m.id}`);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Failed to create memorial',
      );
    }
  };

  return (
    <div className="create-memorial-page">
      <Card className="create-memorial-card">
        <h1 className="create-title">Create a Memorial</h1>
        <p className="create-subtitle">
          Honor someone special by creating a lasting memorial page.
        </p>

        {serverError && <div className="auth-error">{serverError}</div>}

        <form className="create-form" onSubmit={handleSubmit}>
          {/* ── Basic Info ── */}
          <fieldset className="form-section">
            <legend>Basic Information</legend>

            <Input
              label="Full Name *"
              placeholder="e.g. Margaret Anne Ellis"
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fullName: e.target.value }))
              }
              error={errors.fullName}
              required
              autoFocus
            />

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Date of Birth *</label>
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
                    if (current && current.isBefore(dayjs('1800-01-01'), 'day')) return true;
                    if (current && current.isAfter(dayjs(), 'day')) return true;
                    if (current && form.dateOfPassing && current.isAfter(dayjs(form.dateOfPassing), 'day')) return true;
                    return false;
                  }}
                />
                {errors.dateOfBirth && <span className="input-error-text" role="alert">{errors.dateOfBirth}</span>}
              </div>
              <div className="input-group">
                <label className="input-label">Date of Passing *</label>
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
                    if (current && current.isBefore(dayjs('1800-01-01'), 'day')) return true;
                    if (current && current.isAfter(dayjs(), 'day')) return true;
                    if (current && form.dateOfBirth && current.isBefore(dayjs(form.dateOfBirth), 'day')) return true;
                    return false;
                  }}
                />
                {errors.dateOfPassing && <span className="input-error-text" role="alert">{errors.dateOfPassing}</span>}
              </div>
            </div>
          </fieldset>

          {/* ── Biography ── */}
          <fieldset className="form-section">
            <legend>Biography</legend>
            <Textarea
              label="Tell their story"
              placeholder="Share who they were, what they loved, and the legacy they leave behind…"
              value={form.biography}
              onChange={(e) =>
                setForm((f) => ({ ...f, biography: e.target.value }))
              }
              error={errors.biography}
              rows={6}
            />
          </fieldset>

          {/* ── Privacy ── */}
          <fieldset className="form-section">
            <legend>Privacy</legend>
            <PrivacySelector
              value={form.privacyLevel as any}
              onChange={(v) =>
                setForm((f) => ({ ...f, privacyLevel: v }))
              }
            />
          </fieldset>

          {/* ── Category ── */}
          <fieldset className="form-section">
            <legend>Category</legend>
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

          {/* ── Actions ── */}
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create Memorial
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
