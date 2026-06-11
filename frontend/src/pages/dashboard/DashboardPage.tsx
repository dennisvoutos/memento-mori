import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { updateProfileSchema, changePasswordSchema } from '@memento-mori/shared';
import { Skeleton, message, Select } from 'antd';
import { format } from 'date-fns';
import { useMemorialStore } from '../../stores/memorialStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';
import { resolveMediaUrl } from '../../lib/media';
import { extractZodErrors } from '../../lib/validation';
import { truncate, getInitials } from '../../lib/format';
import { CATEGORY_OPTIONS, getSubcategoryOptions, getCategoryLabel, getSubcategoryLabel } from '../../lib/categories';
import { getProfileUpdateCompletion } from './profileUpdateFlow';
import {
  PlusOutlined,
  AppstoreOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  CameraOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import './DashboardPage.css';

const privacyBadge: Record<string, 'private' | 'shared' | 'public'> = {
  PRIVATE: 'private',
  SHARED_LINK: 'shared',
  PUBLIC: 'public',
};

const privacyLabel: Record<string, string> = {
  PRIVATE: 'Private',
  SHARED_LINK: 'Shared Link',
  PUBLIC: 'Public',
};

type SidebarTab = 'memorials' | 'account' | 'support';

const SIDEBAR_ITEMS: { key: SidebarTab; label: string; icon: React.ReactNode }[] = [
  { key: 'memorials', label: 'My Memorials', icon: <AppstoreOutlined /> },
  { key: 'account', label: 'Account', icon: <UserOutlined /> },
  { key: 'support', label: 'Support', icon: <QuestionCircleOutlined /> },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, setUser, logout } = useAuthStore();
  const { memorials, isLoading, error, fetchMyMemorials } = useMemorialStore();

  const initialTab = (searchParams.get('tab') as SidebarTab) || 'memorials';
  const [activeTab, setActiveTab] = useState<SidebarTab>(
    ['memorials', 'account', 'support'].includes(initialTab) ? initialTab : 'memorials'
  );

  /* ── Memorial list filters ── */
  const [dashCategoryFilter, setDashCategoryFilter] = useState<string | undefined>(undefined);
  const [dashSubcategoryFilter, setDashSubcategoryFilter] = useState<string | undefined>(undefined);

  const filteredMemorials = memorials.filter((m) => {
    if (dashCategoryFilter && m.category !== dashCategoryFilter) return false;
    if (dashSubcategoryFilter && m.subcategory !== dashSubcategoryFilter) return false;
    return true;
  });

  const handleTabChange = (tab: SidebarTab) => {
    setActiveTab(tab);
    if (tab === 'memorials') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  /* ── Account state ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName ?? '',
    email: user?.email ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    fetchMyMemorials();
  }, [fetchMyMemorials]);

  useEffect(() => {
    if (user) {
      setProfileForm({ displayName: user.displayName, email: user.email });
    }
  }, [user]);

  /* ── Account handlers ── */
  const handleProfileSave = async () => {
    setProfileErrors({});
    try {
      updateProfileSchema.parse(profileForm);
    } catch (err) {
      const fieldErrors = extractZodErrors(err);
      if (fieldErrors) {
        setProfileErrors(fieldErrors);
        return;
      }
      throw err;
    }
    setProfileSaving(true);
    try {
      const { user: updated } = await api.profile.update(profileForm);
      setUser(updated);

      const completion = getProfileUpdateCompletion(updated);
      message.success(completion.successMessage);

      if (completion.redirectTo) {
        navigate(completion.redirectTo, { replace: true });
        return;
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordErrors({});
    try {
      changePasswordSchema.parse(passwordForm);
    } catch (err) {
      const fieldErrors = extractZodErrors(err);
      if (fieldErrors) {
        setPasswordErrors(fieldErrors);
        return;
      }
      throw err;
    }
    setPasswordSaving(true);
    try {
      await api.profile.changePassword(passwordForm);
      await logout();
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      message.success('Password changed. Please sign in again.');
      navigate('/login', { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to change password');
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
      message.success('Photo updated');
    } catch {
      message.error('Failed to upload photo');
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
      message.success('Photo removed');
    } catch {
      message.error('Failed to remove photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <div className="dash">
      {/* ── Fixed Left Sidebar ── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-header">
          <h2 className="dash-sidebar-title">Dashboard</h2>
          <p className="dash-sidebar-user">{user?.displayName ?? 'User'}</p>
        </div>
        <nav className="dash-sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`dash-nav-item${activeTab === item.key ? ' dash-nav-item--active' : ''}`}
              onClick={() => handleTabChange(item.key)}
              type="button"
            >
              <span className="dash-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="dash-main">
        {activeTab === 'memorials' && (
          <>
            <div className="dash-header">
              <div>
                <h1 className="dash-heading">
                  Welcome back, {user?.displayName?.split(' ')[0] ?? 'friend'}
                </h1>
                <p className="dash-subtitle">
                  {memorials.length === 0
                    ? 'Create your first memorial to get started.'
                    : `You have ${memorials.length} memorial${memorials.length === 1 ? '' : 's'}.`}
                </p>
              </div>
            </div>

            {/* ── Category / Subcategory filters ── */}
            {memorials.length > 0 && (
              <div className="dash-filters">
                <Select
                  value={dashCategoryFilter}
                  onChange={(v) => {
                    setDashCategoryFilter(v);
                    setDashSubcategoryFilter(undefined);
                  }}
                  options={CATEGORY_OPTIONS}
                  placeholder="Filter by category…"
                  allowClear
                  style={{ minWidth: 190 }}
                />
                {dashCategoryFilter && getSubcategoryOptions(dashCategoryFilter).length > 0 && (
                  <Select
                    value={dashSubcategoryFilter}
                    onChange={setDashSubcategoryFilter}
                    options={getSubcategoryOptions(dashCategoryFilter)}
                    placeholder="Filter by subcategory…"
                    allowClear
                    style={{ minWidth: 210 }}
                  />
                )}
              </div>
            )}

            {/* ── Create New Memorial CTA ── */}
            <div
              className="dash-create-card"
              onClick={() => navigate('/memorials/new')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/memorials/new'); }}
            >
              <PlusOutlined className="dash-create-icon" />
              <span className="dash-create-label">Create New Memorial</span>
            </div>

            {isLoading ? (
              <div className="dash-loading">
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : error ? (
              <Card className="dash-error">
                <p>{error}</p>
                <Button variant="secondary" size="sm" onClick={fetchMyMemorials}>
                  Retry
                </Button>
              </Card>
            ) : memorials.length === 0 ? (
              <EmptyState
                title="No memorials yet"
                description="Create a memorial to begin honoring and remembering someone special."
                action={{ label: 'Create Memorial', onClick: () => navigate('/memorials/new') }}
              />
            ) : filteredMemorials.length === 0 ? (
              <EmptyState
                title="No memorials match your filters"
                description="Try clearing the category or subcategory filter."
              />
            ) : (
              <div className="dash-list">
                {filteredMemorials.map((m) => {
                  const photoUrl = m.profilePhotoUrl
                    ? resolveMediaUrl(m.profilePhotoUrl)
                    : null;
                  return (
                    <div className="dash-card" key={m.id}>
                      <div
                        className="dash-card-thumb"
                        style={
                          photoUrl
                            ? { backgroundImage: `url(${photoUrl})` }
                            : undefined
                        }
                      >
                        {!photoUrl && (
                          <span className="dash-card-initials">
                            {getInitials(m.fullName)}
                          </span>
                        )}
                      </div>

                      <div className="dash-card-body">
                        <div className="dash-card-row">
                          <h3 className="dash-card-name">{m.fullName}</h3>
                          <Badge variant={privacyBadge[m.privacyLevel] ?? 'private'}>
                            {privacyLabel[m.privacyLevel] ?? m.privacyLevel}
                          </Badge>
                        </div>
                        {(m.dateOfBirth || m.dateOfPassing) && (
                          <p className="dash-card-dates">
                            {m.dateOfBirth
                              ? format(new Date(m.dateOfBirth), 'MMM d, yyyy')
                              : '?'}
                            {' — '}
                            {m.dateOfPassing
                              ? format(new Date(m.dateOfPassing), 'MMM d, yyyy')
                              : 'present'}
                          </p>
                        )}
                        {m.category && (
                          <p className="dash-card-category">
                            {getCategoryLabel(m.category)}
                            {m.subcategory ? ` · ${getSubcategoryLabel(m.subcategory)}` : ''}
                          </p>
                        )}
                        {m.biography && (
                          <p className="dash-card-bio">
                            {truncate(m.biography)}
                          </p>
                        )}
                        <div className="dash-card-actions">
                          <span className="dash-card-date">
                            Created {format(new Date(m.createdAt), 'MMM d, yyyy')}
                          </span>
                          <div className="dash-card-btns">
                            <Link to={`/memorials/${m.id}`} className="dash-card-link">
                              View
                            </Link>
                            <Link to={`/memorials/${m.id}/edit`} className="dash-card-link dash-card-link--edit">
                              Edit
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══════ ACCOUNT TAB ═══════ */}
        {activeTab === 'account' && user && (
          <div className="dash-placeholder">
            <h1 className="dash-heading">Account</h1>
            <p className="dash-subtitle">Manage your profile information and security.</p>

            {/* Profile Photo */}
            <Card className="dash-account-card">
              <h3 className="dash-account-section-title">Profile Photo</h3>
              <div className="dash-account-photo">
                <Avatar
                  src={user.profilePhotoUrl ?? undefined}
                  name={user.displayName}
                  size="xl"
                />
                <div className="dash-account-photo-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    hidden
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={photoUploading}
                    type="button"
                  >
                    <CameraOutlined /> Upload Photo
                  </Button>
                  {user.profilePhotoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePhotoDelete}
                      isLoading={photoUploading}
                      type="button"
                    >
                      <DeleteOutlined /> Remove
                    </Button>
                  )}
                  <p className="dash-account-hint">JPEG, PNG, or WebP. Max 2 MB.</p>
                </div>
              </div>
            </Card>

            {/* Personal Info */}
            <Card className="dash-account-card">
              <h3 className="dash-account-section-title">Personal Information</h3>
              <div className="dash-account-form">
                <Input
                  label="Display Name"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                  error={profileErrors.displayName}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))}
                  error={profileErrors.email}
                  required
                />
                <div className="dash-account-meta">
                  <span>Member since {format(new Date(user.createdAt), 'MMMM d, yyyy')}</span>
                </div>
                <div className="dash-account-actions">
                  <Button variant="primary" size="sm" isLoading={profileSaving} onClick={handleProfileSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>

            {/* Change Password */}
            <Card className="dash-account-card">
              <h3 className="dash-account-section-title">Change Password</h3>
              <div className="dash-account-form">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                  error={passwordErrors.currentPassword}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  error={passwordErrors.newPassword}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => setPasswordForm(f => ({ ...f, confirmNewPassword: e.target.value }))}
                  error={passwordErrors.confirmNewPassword}
                  required
                />
                <div className="dash-account-actions">
                  <Button variant="primary" size="sm" isLoading={passwordSaving} onClick={handlePasswordChange}>
                    Change Password
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══════ SUPPORT TAB ═══════ */}
        {activeTab === 'support' && (
          <div className="dash-placeholder">
            <h1 className="dash-heading">Support</h1>
            <p className="dash-subtitle">Need help? We're here for you.</p>
            <Card className="dash-support-card">
              <div className="dash-support-grid">
                <Link to="/help" className="dash-support-link-card">
                  <QuestionCircleOutlined className="dash-support-icon" />
                  <strong>Help Center</strong>
                  <span>Browse FAQs and guides</span>
                </Link>
                <Link to="/contact" className="dash-support-link-card">
                  <UserOutlined className="dash-support-icon" />
                  <strong>Contact Us</strong>
                  <span>Send us a message</span>
                </Link>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
