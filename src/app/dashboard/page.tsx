import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEP_STATUS: Record<string, { text: string; color: string }> = {
  PENDING:  { text: 'In afwachting',  color: 'var(--accent-yellow)' },
  APPROVED: { text: 'Goedgekeurd',    color: 'var(--accent-green)' },
  REJECTED: { text: 'Afgewezen',      color: 'var(--accent-red)' },
};
const WIT_STATUS: Record<string, { text: string; color: string }> = {
  PENDING:  { text: 'In behandeling', color: 'var(--accent-yellow)' },
  APPROVED: { text: 'Uitbetaald',     color: 'var(--accent-green)' },
  REJECTED: { text: 'Afgewezen',      color: 'var(--accent-red)' },
};
const TX_COLOR: Record<string, string> = {
  DEPOSIT:              'var(--accent-green)',
  CRASH_BET:            'var(--accent-red)',
  CRASH_WIN:            'var(--accent-green)',
  MINES_BET:            'var(--accent-red)',
  MINES_WIN:            'var(--accent-green)',
  WITHDRAWAL_PENDING:   'var(--accent-red)',
  WITHDRAWAL_APPROVED:  'var(--text-secondary)',
  WITHDRAWAL_REJECTED:  'var(--accent-green)',
};

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [deposits, withdrawals, transactions] = await Promise.all([
    prisma.deposit.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.withdrawal.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const th: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '9px 14px', fontSize: 13, borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Saldo + knoppen */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Je saldo</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--accent-green)', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>€ {user.balance.toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/mines" className="btn-primary" style={{ textDecoration: 'none' }}>💎 Mines</Link>
          <Link href="/crash" className="btn-ghost" style={{ textDecoration: 'none' }}>🚀 Crash</Link>
          <Link href="/deposit" className="btn-ghost" style={{ textDecoration: 'none' }}>+ Storten</Link>
          <Link href="/withdraw" className="btn-ghost" style={{ textDecoration: 'none' }}>↑ Opnemen</Link>
        </div>
      </div>

      {/* Stortingen */}
      <Section title="Stortingen" empty={deposits.length === 0} emptyText="Nog geen stortingen.">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Datum</th><th style={th}>Bedrag</th><th style={th}>Status</th><th style={th}>Admin opmerking</th></tr></thead>
          <tbody>
            {deposits.map((d) => {
              const s = DEP_STATUS[d.status] ?? { text: d.status, color: 'var(--text-primary)' };
              return (
                <tr key={d.id}>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{new Date(d.createdAt).toLocaleString('nl-NL')}</td>
                  <td style={{ ...td, fontWeight: 700 }}>€ {d.amount.toFixed(2)}</td>
                  <td style={{ ...td, fontWeight: 700, color: s.color }}>{s.text}</td>
                  <td style={{ ...td, color: 'var(--text-muted)' }}>{d.reviewNote || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      {/* Opnames */}
      <Section title="Opnames" empty={withdrawals.length === 0} emptyText="Nog geen opnames.">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Datum</th><th style={th}>Bedrag</th><th style={th}>Status</th><th style={th}>Admin opmerking</th></tr></thead>
          <tbody>
            {withdrawals.map((w) => {
              const s = WIT_STATUS[w.status] ?? { text: w.status, color: 'var(--text-primary)' };
              return (
                <tr key={w.id}>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{new Date(w.createdAt).toLocaleString('nl-NL')}</td>
                  <td style={{ ...td, fontWeight: 700 }}>€ {w.amount.toFixed(2)}</td>
                  <td style={{ ...td, fontWeight: 700, color: s.color }}>{s.text}</td>
                  <td style={{ ...td, color: 'var(--text-muted)' }}>{w.reviewNote || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      {/* Transacties */}
      <Section title="Saldo-historie" empty={transactions.length === 0} emptyText="Nog geen transacties.">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Datum</th><th style={th}>Type</th><th style={th}>Bedrag</th><th style={th}>Saldo na</th></tr></thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td style={{ ...td, color: 'var(--text-secondary)' }}>{new Date(t.createdAt).toLocaleString('nl-NL')}</td>
                <td style={{ ...td, color: 'var(--text-secondary)' }}>{t.type}</td>
                <td style={{ ...td, fontWeight: 700, color: TX_COLOR[t.type] ?? 'var(--text-primary)' }}>
                  {t.amount > 0 ? '+' : t.amount < 0 ? '' : ''}€ {Math.abs(t.amount).toFixed(2)}
                </td>
                <td style={{ ...td }}>€ {t.balanceAfter.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Section({ title, empty, emptyText, children }: { title: string; empty: boolean; emptyText: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>{title}</h2>
      {empty
        ? <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{emptyText}</p>
        : <div className="card" style={{ padding: 0, overflowX: 'auto' }}>{children}</div>
      }
    </div>
  );
}
