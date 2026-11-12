import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DepositActions from './DepositActions';
import AdminNav from '@/components/layout/AdminNav';

const STATUS: Record<string, { text: string; color: string }> = {
  PENDING: { text: 'In afwachting', color: 'var(--accent-yellow)' },
  APPROVED: { text: 'Goedgekeurd', color: 'var(--accent-green)' },
  REJECTED: { text: 'Afgewezen', color: 'var(--accent-red)' },
};

const muted = { color: 'var(--text-secondary)' } as const;
const small = { fontSize: 12 } as const;

export default async function AdminDeposits() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const deposits = await prisma.deposit.findMany({
    include: { user: { select: { username: true, email: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  const pending = deposits.filter((d) => d.status === 'PENDING');
  const reviewed = deposits.filter((d) => d.status !== 'PENDING');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Admin — Stortingen</h1>
        <p style={{ ...small, color: 'var(--text-secondary)', marginTop: 4 }}>
          {pending.length} wachtend op goedkeuring
        </p>
      </div>
      <AdminNav active="/admin/deposits" />

      {pending.length === 0 && (
        <p style={{ color: 'var(--text-secondary)' }}>Geen openstaande stortingen. 🎉</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pending.map((d) => (
          <div key={d.id} className="card" style={{ borderColor: 'rgba(255,193,7,0.25)' }}>
            <div className="md:grid-cols-[1fr_minmax(240px,360px)]" style={{ display: 'grid', gap: 18 }}>
              {/* Linker info + acties */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.user.username}</div>
                    <div style={{ ...small, color: 'var(--text-muted)' }}>{d.user.email}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-green)' }}>
                    € {d.amount.toFixed(2)}
                  </div>
                </div>
                <div style={{ ...small, color: 'var(--text-secondary)' }}>
                  Ingediend: {new Date(d.createdAt).toLocaleString('nl-NL')}
                </div>
                {d.note && (
                  <div style={small}>
                    <span style={{ color: 'var(--text-muted)' }}>Opmerking gebruiker: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{d.note}</span>
                  </div>
                )}
                <DepositActions depositId={d.id} amount={d.amount} username={d.user.username} />
              </div>

              {/* Rechter bewijs */}
              <div>
                <a href={`/api/admin/proof?id=${d.id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/proof?id=${d.id}`}
                    alt="Betalingsbewijs"
                    style={{ maxHeight: 320, width: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
                  />
                </a>
                <p style={{ ...small, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                  Klik om te vergroten · PDF opent in nieuw tabblad
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reviewed.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            Recent beoordeeld
          </h2>
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  {['Datum', 'Gebruiker', 'Bedrag', 'Status', 'Opmerking'].map((h) => (
                    <th key={h} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviewed.map((d) => {
                  const s = STATUS[d.status] || { text: d.status, color: 'var(--text-primary)' };
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{new Date(d.createdAt).toLocaleString('nl-NL')}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{d.user.username}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>€ {d.amount.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: s.color }}>{s.text}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{d.reviewNote || '—'}</td>
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
