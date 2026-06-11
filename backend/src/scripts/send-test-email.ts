import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY || 're_xxxxxxxxx';
if (apiKey === 're_xxxxxxxxx') {
    console.warn('Warning: RESEND_API_KEY is a placeholder. Replace `re_xxxxxxxxx` with your real API key.');
}

const resend = new Resend(apiKey);

async function main() {
    const from = process.env.RESEND_FROM_EMAIL || 'noreply@mymementomori.com';
    const to = 'dennisvoutos@gmail.com';

    const resp = await resend.emails.send({
        from,
        to,
        subject: 'Testing Resend',
        html: '<h1>Hello World</h1>',
    });

    console.log('Resend response:', resp);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((err) => {
        console.error('Failed to send test email:', err);
        process.exit(1);
    });
}
