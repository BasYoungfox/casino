import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import WithdrawForm from './WithdrawForm';

export default async function WithdrawPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const STATUS: Record<string, { text: string; color: string }> = {
    PENDING:  { text: 'In behandeling', color: 'var(--accent-yellow)' },
    APPROVED: { text: 'Uitbetaald',     color: 'var(--accent-green)' },
    REJECTED: { text: 'Afgewezen',      color: 'var(--accent-red)' },
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: 'var(--text-primary)' }}>Opnemen</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
        Je saldo wordt direct geblokkeerd. De admin betaalt je via Tikkie en keurt de opname goed.
      </p>

      {/* Uitleg stappen */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-orange)', marginBottom: 12 }}>Hoe het werkt</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Open de Tikkie-app en maak een betaalverzoek aan met open prijs.',
            'Kopieer jouw Tikkie-link en vul hem hieronder in samen met het opnamebedrag.',
            'Je saldo wordt direct geblokkeerd. De admin betaalt via jouw Tikkie-link.',
            'Na betaling goedkeuren — klaar! Bij afkeuring krijg je je saldo terug.',
          ].map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 2 }}>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Formulier */}
      <div className="card" style={{ marginBottom: 16 }}>
        <WithdrawForm balance={user.balance} />
      </div>

      {/* Geschiedenis */}
      {withdrawals.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Opname-geschiedenis</h2>
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  {['Datum', 'Bedrag', 'Status', 'Opmerking admin'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const s = STATUS[w.status] ?? { text: w.status, color: 'var(--text-primary)' };
                  return (
                    <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(w.createdAt).toLocaleString('nl-NL')}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontWeight: 700 }}>€ {w.amount.toFixed(2)}</td>
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
