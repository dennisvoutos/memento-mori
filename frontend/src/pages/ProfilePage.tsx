import { useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { message } from 'antd';
import { CameraOutlined, DeleteOutlined } from '@ant-design/icons';
import { updateProfileSchema, changePasswordSchema } from '@memento-mori/shared';
import type { core } from 'zod';
import './ProfilePage.css';

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Profile form ──
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName ?? '',
    email: user?.email ?? '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Password form ──
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ── Photo upload ──
  const [photoUploading, setPhotoUploading] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});

    try {
      updateProfileSchema.parse(profileForm);
    } catch (err) {
      const zodError = err as { issues: core.$ZodIssue[] };
      const fieldErrors: Record<string, string> = {};
      zodError.issues.forEach((issue: core.$ZodIssue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setProfileErrors(fieldErrors);
      return;
    }

    setProfileSaving(true);
    try {
      const { user: updated } = await api.profile.update(profileForm);
      setUser(updated);
      message.success('Profile updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      message.error(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    try {
      changePasswordSchema.parse(passwordForm);
    } catch (err) {
      const zodError = err as { issues: core.$ZodIssue[] };
      const fieldErrors: Record<string, string> = {};
      zodError.issues.forEach((issue: core.$ZodIssue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setPasswordErrors(fieldErrors);
      return;
    }

    setPasswordSaving(true);
    try {
      await api.profile.changePassword(passwordForm);
      message.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      message.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const { user: updated } = await api.profile.uploadPhoto(file);
      setUser(updated);
      message.success('Profile photo updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo';
      message.error(msg);
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    setPhotoUploading(true);
    try {
      const { user: updated } = await api.profile.deletePhoto();
      setUser(updated);
      message.success('Profile photo removed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove photo';
      message.error(msg);
    } finally {
      setPhotoUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <h1 className="profile-title">Profile Settings</h1>
      <p className="profile-subtitle">Manage your account information.</p>

      {/* ── Profile Photo ── */}
      <Card className="profile-card">
        <h2 className="card-heading">Profile Photo</h2>
        <div className="photo-section">
          <Avatar
            src={user.profilePhotoUrl ?? undefined}
            name={user.displayName}
            size="xl"
          />
          <div className="photo-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              hidden
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              isLoading={photoUploading}
              type="button"
            >
              <CameraOutlined /> Upload Photo
            </Button>
            {user.profilePhotoUrl && (
              <Button
                variant="ghost"
                onClick={handlePhotoDelete}
                isLoading={photoUploading}
                type="button"
              >
                <DeleteOutlined /> Remove
              </Button>
            )}
            <p className="photo-hint">JPEG, PNG, or WebP. Max 2 MB.</p>
          </div>
        </div>
      </Card>

      {/* ── Profile Info ── */}
      <Card className="profile-card">
        <h2 className="card-heading">Personal Information</h2>
        <form className="profile-form" onSubmit={handleProfileSubmit}>
          <Input
            label="Display Name"
            value={profileForm.displayName}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, displayName: e.target.value }))
            }
            error={profileErrors.displayName}
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={profileForm.email}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, email: e.target.value }))
            }
            error={profileErrors.email}
            required
          />
          <div className="form-actions">
            <Button type="submit" variant="primary" isLoading={profileSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Change Password ── */}
      <Card className="profile-card">
        <h2 className="card-heading">Change Password</h2>
        <form className="profile-form" onSubmit={handlePasswordSubmit}>
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm((f) => ({
                ...f,
                currentPassword: e.target.value,
              }))
            }
            error={passwordErrors.currentPassword}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm((f) => ({
                ...f,
                newPassword: e.target.value,
              }))
            }
            error={passwordErrors.newPassword}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmNewPassword}
            onChange={(e) =>
              setPasswordForm((f) => ({
                ...f,
                confirmNewPassword: e.target.value,
              }))
            }
            error={passwordErrors.confirmNewPassword}
            required
          />
          <div className="form-actions">
            <Button type="submit" variant="primary" isLoading={passwordSaving}>
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
