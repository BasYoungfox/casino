'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const icons: Record<string, React.ReactNode> = {
  home: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
  wallet: <path d="M21 7H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm0 5h-2a2 2 0 0 1 0-4h2z" />,
  withdraw: <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />,
  shield: <path d="M12 2L4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5l-8-3z" />,
  mines: <path d="M12 2L2 20h20L12 2zm0 3.84l7.02 12.16H4.98L12 5.84zm0 3.16L8.5 15h7L12 9z" />,
  original: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />,
};

export default function LeftNav({ role }: { role: string }) {
  const pathname = usePathname();

  const accountItems = [
    { icon: 'home',     label: 'Dashboard', path: '/dashboard' },
    { icon: 'wallet',   label: 'Storten',   path: '/deposit' },
    { icon: 'withdraw', label: 'Opnemen',   path: '/withdraw' },
    ...(role === 'ADMIN' ? [{ icon: 'shield', label: 'Admin', path: '/admin/overview' }] : []),
  ];

  const gameItems = [
    { icon: 'mines', label: 'Mines', path: '/mines' },
    { icon: 'original', label: 'Crash', path: '/crash' },
  ];

  const isActive = (p: string) =>
    pathname === p || (p !== '/' && pathname.startsWith(p));

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <Link href="/" className="logo-link" style={{ textDecoration: 'none' }}>
          <span className="logo" style={{ color: 'var(--text-primary)' }}>Casino</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-title">Originals</h3>
          {gameItems.map((item) => (
            <Link key={item.path} href={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">{icons[item.icon]}</svg>
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="nav-section">
          <h3 className="nav-title">Account</h3>
          {accountItems.map((item) => (
            <Link key={item.path} href={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">{icons[item.icon]}</svg>
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
