import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { PendingVerificationBanner } from './PendingVerificationBanner';
import { CookieConsentBanner } from './CookieConsentBanner';

interface PageContainerProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  maxWidth?: string;
}

export function PageContainer({
  children,
  showHeader = true,
  showFooter = true,
  maxWidth,
}: PageContainerProps) {
  return (
    <>
      <div className="page-background" aria-hidden="true" />
      {showHeader && <Header />}
      {showHeader && <PendingVerificationBanner />}
      <main
        style={{
          maxWidth: maxWidth || '100%',
          margin: '0 auto',
          padding: '0',
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        {children}
      </main>
      {showFooter && <Footer />}
      <CookieConsentBanner />
    </>
  );
}
