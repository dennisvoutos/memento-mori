import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

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
      <main
        style={{
          maxWidth: maxWidth || 'var(--content-width)',
          margin: '0 auto',
          padding: '32px 24px',
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        {children}
      </main>
      {showFooter && <Footer />}
    </>
  );
}
