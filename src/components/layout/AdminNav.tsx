import Link from 'next/link';

const LINKS = [
  { href: '/admin/overview',     label: 'Statistiek' },
  { href: '/admin/sessions',     label: 'Live sessies' },
  { href: '/admin/deposits',     label: 'Stortingen' },
  { href: '/admin/withdrawals',  label: 'Opnames' },
  { href: '/admin/settings',     label: 'Instellingen' },
];

export default function AdminNav({ active }: { active: string }) {
  return (
    <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
      {LINKS.map((l) => {
        const isActive = l.href === active || (l.href !== '/admin/overview' && active.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 600,
              background: isActive ? 'var(--bg-tertiary)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: `1px solid ${isActive ? 'var(--border-color)' : 'transparent'}`,
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
