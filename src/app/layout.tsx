import type { Metadata } from 'next';
import './globals.css';
import { getSession } from '@/lib/auth';
import { BalanceProvider } from '@/components/providers/BalanceProvider';
import LeftNav from '@/components/layout/LeftNav';
import TopBar from '@/components/layout/TopBar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Casino',
  description: 'Casino met iDEAL/Tikkie stortingen — Mines & Crash',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="nl" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased h-full">
        {session ? (
          <BalanceProvider
            initialBalance={session.balance}
            username={session.username}
            role={session.role}
          >
            <div className="app-layout">
              <LeftNav role={session.role} />
              <div className="app-main-wrapper">
                <TopBar />
                <main
                  className="main-content hide-scrollbar"
                  style={{ overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                  {children}
                </main>
              </div>
            </div>
          </BalanceProvider>
        ) : (
          <div className="app-layout">
            <div className="app-main-wrapper">
              <header className="header">
                <div className="header-left">
                  <Link href="/" className="logo-link" style={{ textDecoration: 'none' }}>
                    <span className="logo" style={{ color: 'var(--text-primary)' }}>Casino</span>
                  </Link>
                </div>
                <div className="header-right" style={{ gap: 8 }}>
                  <Link href="/login" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Inloggen
                  </Link>
                  <Link href="/register" className="wallet-btn" style={{ textDecoration: 'none' }}>
                    Registreren
                  </Link>
                </div>
              </header>
              <main
                className="main-content hide-scrollbar"
                style={{ overflowY: 'auto' }}
              >
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
