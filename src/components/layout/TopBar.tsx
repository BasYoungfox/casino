'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useBalance } from '@/components/providers/BalanceProvider';

export default function TopBar() {
  const { balance, username, role, refresh } = useBalance();

  // Poll balance every 10s so deposits/withdrawals approved by admin
  // are reflected without requiring a page reload or re-login
  useEffect(() => {
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <header className="header">
      <div className="header-left">
        <Link href="/" className="logo-link" style={{ textDecoration: 'none' }}>
          <span className="logo" style={{ color: 'var(--text-primary)' }}>Casino</span>
        </Link>
      </div>

      <div className="header-center">
        <div className="header-wallet">
          <div className="wallet-balance-display">
            <span className="wallet-currency-icon" style={{ fontSize: 11 }}>€</span>
            <span className="wallet-balance-amount">{balance.toFixed(2)}</span>
          </div>
          <Link href="/deposit" className="wallet-btn" style={{ textDecoration: 'none' }}>
            Saldo
          </Link>
        </div>
      </div>

      <div className="header-right">
        <Link href="/deposit" className="header-icon-btn" title="Storten" style={{ textDecoration: 'none' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M21 7H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm0 5h-2a2 2 0 0 1 0-4h2zM10 20v-6h4v6z" />
          </svg>
        </Link>
        {role === 'ADMIN' && (
          <Link href="/admin/overview" className="header-icon-btn" title="Admin" style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2L4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5l-8-3z" />
            </svg>
          </Link>
        )}
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, padding: '0 4px' }}>
          {username}
        </span>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="header-icon-btn"
            title="Uitloggen"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
