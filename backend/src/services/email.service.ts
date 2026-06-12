import { Resend } from 'resend';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Configurable values (all pulled from .env) ──
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'dennisvoutos@gmail.com';
const DEFAULT_FRONTEND_APP_URL = 'http://localhost:5173';
const DEFAULT_EMAIL_VERIFICATION_TTL_HOURS = 24;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set. Add it to your backend environment.');
  }

  return new Resend(apiKey);
}

function getResendFromEmail() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL is not set. Add it to your backend environment.');
  }

  return fromEmail;
}

function getFrontendAppUrl() {
  const configuredUrl = process.env.FRONTEND_APP_URL?.trim() || DEFAULT_FRONTEND_APP_URL;

  try {
    const url = new URL(configuredUrl);
    if (!url.pathname.endsWith('/')) {
      url.pathname = `${url.pathname}/`;
    }
    return url;
  } catch {
    throw new Error('FRONTEND_APP_URL is invalid. Update your backend environment.');
  }
}

function getEmailVerificationTtlHours() {
  const parsed = Number.parseInt(
    process.env.EMAIL_VERIFICATION_TTL_HOURS?.trim() || '',
    10
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_EMAIL_VERIFICATION_TTL_HOURS;
}

interface VerificationEmailPayload {
  email: string;
  token: string;
  displayName?: string | null;
}

export async function sendVerificationEmail({
  email,
  token,
  displayName,
}: VerificationEmailPayload) {
  const resend = getResendClient();
  const from = getResendFromEmail();
  const appUrl = getFrontendAppUrl();
  const verificationUrl = new URL('verify-email', appUrl);
  verificationUrl.searchParams.set('token', token);

  const safeName = displayName?.trim() ? escapeHtml(displayName.trim()) : 'there';
  const ttlHours = getEmailVerificationTtlHours();
  const link = verificationUrl.toString();

  await resend.emails.send({
    from,
    to: email,
    subject: 'Verify your email address',
    text: [
      `Hi ${displayName?.trim() || 'there'},`,
      '',
      `Welcome to My Memento Mori. Verify your email address by opening this link within ${ttlHours} hours:`,
      link,
      '',
      `If you didn't create this account, you can ignore this email.`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2f2a26; line-height: 1.6;">
        <h1 style="font-size: 24px; margin-bottom: 12px;">Welcome to My Memento Mori</h1>
        <p style="margin: 0 0 16px;">Hi ${safeName},</p>
        <p style="margin: 0 0 16px;">
          Please verify your email address to finish setting up your account. This link is valid for ${ttlHours} hours.
        </p>
        <p style="margin: 0 0 24px;">
          <a
            href="${link}"
            style="display: inline-block; padding: 12px 20px; background: #c9a84c; color: #1f1a16; text-decoration: none; border-radius: 999px; font-weight: 600;"
          >
            Verify my email
          </a>
        </p>
        <p style="margin: 0 0 16px; font-size: 13px; color: #5f5953; word-break: break-all;">
          If the button does not work, copy and paste this URL into your browser:<br>
          <a href="${link}" style="color: #8a6c16;">${link}</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #8d8780;">
          If you did not create this account, you can ignore this email.
        </p>
      </div>
    `,
  });
}

interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId: string | null;
}

function getContactRecipient() {
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL?.trim() || CONTACT_EMAIL;
  if (!recipient) {
    throw new Error('CONTACT_RECIPIENT_EMAIL or CONTACT_EMAIL must be set.');
  }
  return recipient;
}

function getPasswordResetTtlMinutes(): number {
  const parsed = Number.parseInt(
    process.env.PASSWORD_RESET_TTL_MINUTES?.trim() || '',
    10
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

interface PasswordResetEmailPayload {
  email: string;
  token: string;
  displayName?: string | null;
}

export async function sendPasswordResetEmail({
  email,
  token,
  displayName,
}: PasswordResetEmailPayload) {
  const resend = getResendClient();
  const from = getResendFromEmail();
  const appUrl = getFrontendAppUrl();
  const resetUrl = new URL('reset-password', appUrl);
  resetUrl.searchParams.set('token', token);

  const safeName = displayName?.trim() ? escapeHtml(displayName.trim()) : 'there';
  const ttlMinutes = getPasswordResetTtlMinutes();
  const link = resetUrl.toString();

  await resend.emails.send({
    from,
    to: email,
    subject: 'Reset your password',
    text: [
      `Hi ${displayName?.trim() || 'there'},`,
      '',
      'We received a request to reset your password for your My Memento Mori account.',
      '',
      `Open this link within ${ttlMinutes} minutes to choose a new password:`,
      link,
      '',
      'If you did not request a password reset, you can safely ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2f2a26; line-height: 1.6;">
        <h1 style="font-size: 24px; margin-bottom: 12px;">Reset your password</h1>
        <p style="margin: 0 0 16px;">Hi ${safeName},</p>
        <p style="margin: 0 0 16px;">
          We received a request to reset your password for your My Memento Mori account.
          This link is valid for ${ttlMinutes} minutes.
        </p>
        <p style="margin: 0 0 24px;">
          <a
            href="${link}"
            style="display: inline-block; padding: 12px 20px; background: #c9a84c; color: #1f1a16; text-decoration: none; border-radius: 999px; font-weight: 600;"
          >
            Reset my password
          </a>
        </p>
        <p style="margin: 0 0 16px; font-size: 13px; color: #5f5953; word-break: break-all;">
          If the button does not work, copy and paste this URL into your browser:<br>
          <a href="${link}" style="color: #8a6c16;">${link}</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #8d8780;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendContactEmail(payload: ContactPayload) {
  const resend = getResendClient();
  const from = getResendFromEmail();
  const to = getContactRecipient();
  const safeSubject = escapeHtml(payload.subject);
  const safeName = escapeHtml(payload.name);
  const safeEmail = escapeHtml(payload.email);
  const safeUserId = escapeHtml(payload.userId ?? 'Not logged in');
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, '<br>');

  await resend.emails.send({
    from,
    to,
    replyTo: payload.email,
    subject: `[Memento Mori] ${payload.subject}`,
    text: [
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      payload.userId ? `User ID: ${payload.userId}` : 'User: Not logged in',
      '',
      '--- Message ---',
      payload.message,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3a3632;">${safeSubject}</h2>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
          <tr><td style="padding: 8px; font-weight: bold; color: #6b6560;">Name</td><td style="padding: 8px;">${safeName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #6b6560;">Email</td><td style="padding: 8px;"><a href="mailto:${encodeURIComponent(payload.email)}">${safeEmail}</a></td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #6b6560;">User</td><td style="padding: 8px;">${safeUserId}</td></tr>
        </table>
        <div style="background: #f5f3f0; border-radius: 8px; padding: 20px; color: #3a3632; line-height: 1.6;">
          ${safeMessage}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9a948e;">Sent from Memento Mori contact form</p>
      </div>
    `,
  });

  console.log('📧 Contact email sent via Resend');
}
