import nodemailer from 'nodemailer';

// ── Configurable values (all pulled from .env) ──
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'dennisvoutos@gmail.com';
const SMTP_HOST     = process.env.SMTP_HOST      || 'smtp.gmail.com';
const SMTP_PORT     = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER     = process.env.SMTP_USER      || 'dennisvoutos@gmail.com';
const SMTP_PASS     = process.env.SMTP_PASS      || '';
// During local development some environments (corporate proxies, intercepting proxies)
// can cause TLS cert issues. Set DEV_ALLOW_INSECURE_SMTP=true in .env to allow
// connecting to SMTP servers with an untrusted certificate for debugging only.
const DEV_ALLOW_INSECURE_SMTP = process.env.DEV_ALLOW_INSECURE_SMTP === 'true';

function getTransporter() {
  if (!SMTP_PASS) {
    throw new Error(
      'SMTP_PASS is not set. Add a Gmail App Password to your .env file. '
      + 'See: https://myaccount.google.com/apppasswords'
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: DEV_ALLOW_INSECURE_SMTP ? { rejectUnauthorized: false } : undefined,
  });
}

interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId: string | null;
}

export async function sendContactEmail(payload: ContactPayload) {
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: `"Memento Mori" <${SMTP_USER}>`,
    to: CONTACT_EMAIL,
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
        <h2 style="color: #3a3632;">${payload.subject}</h2>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
          <tr><td style="padding: 8px; font-weight: bold; color: #6b6560;">Name</td><td style="padding: 8px;">${payload.name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #6b6560;">Email</td><td style="padding: 8px;"><a href="mailto:${payload.email}">${payload.email}</a></td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #6b6560;">User</td><td style="padding: 8px;">${payload.userId ?? 'Not logged in'}</td></tr>
        </table>
        <div style="background: #f5f3f0; border-radius: 8px; padding: 20px; color: #3a3632; line-height: 1.6;">
          ${payload.message.replace(/\n/g, '<br>')}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9a948e;">Sent from Memento Mori contact form</p>
      </div>
    `,
  });

  console.log('📧 Contact email sent, messageId:', info.messageId);
}
