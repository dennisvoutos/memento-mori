export interface SignupEmailProvider {
    name: string;
    domains: readonly string[];
}

export const ALLOWED_SIGNUP_EMAIL_PROVIDERS: readonly SignupEmailProvider[] = [
    { name: 'Gmail', domains: ['gmail.com'] },
    { name: 'Outlook', domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'] },
    { name: 'Yahoo', domains: ['yahoo.com', 'ymail.com', 'rocketmail.com'] },
    { name: 'iCloud', domains: ['icloud.com', 'me.com', 'mac.com'] },
    { name: 'AOL', domains: ['aol.com'] },
    { name: 'Proton Mail', domains: ['proton.me', 'protonmail.com', 'pm.me'] },
    { name: 'Zoho Mail', domains: ['zoho.com'] },
    { name: 'GMX', domains: ['gmx.com', 'gmx.us', 'gmx.de'] },
    { name: 'Mail.com', domains: ['mail.com'] },
    { name: 'Yandex Mail', domains: ['yandex.com', 'yandex.ru'] },
    { name: 'Fastmail', domains: ['fastmail.com', 'fastmail.fm'] },
    { name: 'QQ Mail', domains: ['qq.com'] },
    { name: '163 Mail', domains: ['163.com'] },
    { name: '126 Mail', domains: ['126.com'] },
    { name: 'Naver Mail', domains: ['naver.com'] },
    { name: 'Daum Mail', domains: ['daum.net', 'hanmail.net'] },
    { name: 'Web.de', domains: ['web.de'] },
    { name: 'Orange Mail', domains: ['orange.fr'] },
    { name: 'Comcast', domains: ['comcast.net'] },
    { name: 'AT&T Mail', domains: ['att.net'] },
];

const ALLOWED_SIGNUP_EMAIL_DOMAINS = new Set(
    ALLOWED_SIGNUP_EMAIL_PROVIDERS.flatMap((provider) => provider.domains)
);

export const UNSUPPORTED_SIGNUP_EMAIL_PROVIDER_MESSAGE =
    'This email provider is not supported yet. Please sign up with one of our currently supported providers, such as Gmail, Outlook, Yahoo, iCloud, AOL, or Proton Mail.';

export function getEmailDomain(email: string): string | null {
    const trimmedEmail = email.trim().toLowerCase();
    const atIndex = trimmedEmail.lastIndexOf('@');

    if (atIndex <= 0 || atIndex === trimmedEmail.length - 1) {
        return null;
    }

    return trimmedEmail.slice(atIndex + 1);
}

export function isAllowedSignupEmailProvider(email: string): boolean {
    const domain = getEmailDomain(email);

    return domain ? ALLOWED_SIGNUP_EMAIL_DOMAINS.has(domain) : false;
}

export function getSignupEmailProviderWarning(email: string): string | null {
    const domain = getEmailDomain(email);

    if (!domain || ALLOWED_SIGNUP_EMAIL_DOMAINS.has(domain)) {
        return null;
    }

    return UNSUPPORTED_SIGNUP_EMAIL_PROVIDER_MESSAGE;
}