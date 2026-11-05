import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminNav from '@/components/layout/AdminNav';
import WithdrawalActions from './WithdrawalActions';

const STATUS: Record<string, { text: string; color: string }> = {
  PENDING:  { text: 'In behandeling', color: 'var(--accent-yellow)' },
  APPROVED: { text: 'Uitbetaald',     color: 'var(--accent-green)' },
  REJECTED: { text: 'Afgewezen',      color: 'var(--accent-red)' },
};

export default async function AdminWithdrawals() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const withdrawals = await prisma.withdrawal.findMany({
    include: { user: { select: { username: true, email: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  const pending  = withdrawals.filter((w) => w.status === 'PENDING');
  const reviewed = withdrawals.filter((w) => w.status !== 'PENDING');
  const totalPending = pending.reduce((s, w) => s + w.amount, 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Admin</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 18 }}>
        Opnames — {pending.length} openstaand · totaal te betalen&nbsp;
        <strong style={{ color: 'var(--accent-red)' }}>€ {totalPending.toFixed(2)}</strong>
      </p>
      <AdminNav active="/admin/withdrawals" />

      {pending.length === 0 && (
        <p style={{ color: 'var(--text-secondary)' }}>Geen openstaande opnames. 🎉</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pending.map((w) => (
          <div key={w.id} className="card" style={{ borderColor: 'rgba(255,193,7,0.25)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{w.user.username}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>{w.user.email}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {new Date(w.createdAt).toLocaleString('nl-NL')}
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent-red)', textAlign: 'right' }}>
                € {w.amount.toFixed(2)}
              </div>
            </div>

            {/* Tikkie-link — klikbaar, zo kan admin direct betalen */}
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tikkie-link (klik om te betalen)</div>
              <a href={w.tikkieUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent-blue)', fontSize: 13, wordBreak: 'break-all', fontWeight: 600 }}>
                {w.tikkieUrl}
              </a>
            </div>

            {w.note && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Opmerking: </span>{w.note}
              </p>
            )}

            <WithdrawalActions id={w.id} amount={w.amount} username={w.user.username} />
          </div>
        ))}
      </div>

      {reviewed.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Recent beoordeeld</h2>
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  {['Datum', 'Gebruiker', 'Bedrag', 'Tikkie', 'Status', 'Opmerking'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviewed.map((w) => {
                  const s = STATUS[w.status] ?? { text: w.status, color: 'var(--text-primary)' };
                  return (
                    <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(w.createdAt).toLocaleString('nl-NL')}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{w.user.username}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>€ {w.amount.toFixed(2)}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <a href={w.tikkieUrl} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--accent-blue)', fontSize: 12 }}>Link ↗</a>
                      </td>
                      <td style={{ padding: '9px 14px', fontWeight: 700, color: s.color }}>{s.text}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-muted)' }}>{w.reviewNote || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
