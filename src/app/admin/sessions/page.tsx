import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminNav from '@/components/layout/AdminNav';
import { eur } from '@/lib/stats';
import RefreshTicker from './RefreshTicker';

export default async function AdminSessions() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [crashRounds, minesGames, recentUsers] = await Promise.all([
    prisma.crashRound.findMany({
      where: { status: 'RUNNING' },
      include: { user: { select: { username: true } } },
      orderBy: { startTime: 'desc' },
      take: 50,
    }),
    prisma.minesGame.findMany({
      where: { status: 'RUNNING' },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.transaction.findMany({
      where: { createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } },
      select: { userId: true, type: true, amount: true },
    }),
  ]);

  const activeUserIds = new Set(recentUsers.map((t) => t.userId));
  const recentWagered = recentUsers
    .filter((t) => t.type.endsWith('_BET'))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Admin</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 18 }}>
        Live sessies
        <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent-green)', fontWeight: 600, verticalAlign: 'middle' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
          vernieuwt elke 10s
        </span>
      </p>
      <AdminNav active="/admin/sessions" />
      <RefreshTicker intervalMs={10000} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 22 }}>
        <Kpi label="Actieve Crash-rondes" value={String(crashRounds.length)} />
        <Kpi label="Actieve Mines-spellen" value={String(minesGames.length)} />
        <Kpi label="Actieve gebruikers (15 min)" value={String(activeUserIds.size)} />
        <Kpi label="Ingezet (laatste 15 min)" value={eur(recentWagered)} />
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Crash — lopend</h2>
      {crashRounds.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Geen actieve ronden.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                {['Gebruiker', 'Inzet', ' gestart', 'Verstreken', 'Auto cashout'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crashRounds.map((r) => {
                const elapsed = Math.max(0, Date.now() - r.startTime.getTime()) / 1000;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '9px 12px', color: 'var(--text-primary)' }}>{r.user.username}</td>
                    <td style={{ padding: '9px 12px' }}>{eur(r.betAmount)}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{new Date(r.startTime).toLocaleTimeString('nl-NL')}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--accent-orange)' }}>{elapsed.toFixed(1)}s</td>
                    <td style={{ padding: '9px 12px', color: r.autoCashout ? 'var(--accent-green)' : 'var(--text-muted)' }}>{r.autoCashout ? `${r.autoCashout.toFixed(2)}×` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 22, marginBottom: 10 }}>Mines — lopend</h2>
      {minesGames.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Geen actieve spellen.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                {['Gebruiker', 'Inzet', 'Mijnen', 'Onthuld', 'Multiplier'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {minesGames.map((g) => {
                const picks = (JSON.parse(g.revealed) as number[]).length;
                return (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '9px 12px', color: 'var(--text-primary)' }}>{g.user.username}</td>
                    <td style={{ padding: '9px 12px' }}>{eur(g.betAmount)}</td>
                    <td style={{ padding: '9px 12px' }}>{g.minesCount}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{picks} / {g.totalTiles - g.minesCount}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--accent-green)' }}>{g.multiplier.toFixed(2)}×</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent || 'var(--text-primary)', marginTop: 6 }}>{value}</div>
    </div>
  );
}
