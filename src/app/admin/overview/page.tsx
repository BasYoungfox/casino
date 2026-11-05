import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { computeStats, eur, pct, type GameStat } from '@/lib/stats';
import { prisma } from '@/lib/prisma';
import AdminNav from '@/components/layout/AdminNav';

export default async function AdminOverview() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const s = await computeStats();

  // Alle gebruikers met saldo en inzetstatistieken
  const users = await prisma.user.findMany({
    orderBy: { balance: 'desc' },
    select: {
      id: true, username: true, email: true, balance: true, role: true, createdAt: true,
      _count: { select: { crashRounds: true, minesGames: true } },
    },
    take: 50,
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Admin</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 18 }}>Statistiek &amp; wiskunde per game</p>
      <AdminNav active="/admin/overview" />

      {/* KPI's */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 22 }}>
        <Kpi label="Totaal ingezet" value={eur(s.total.wagered)} />
        <Kpi label="Uitbetaald" value={eur(s.total.won)} />
        <Kpi label="Huiswinst (GGR)" value={eur(s.total.ggr)} accent={s.total.ggr >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <Kpi label="RTP" value={pct(s.total.rtp)} />
        <Kpi label="Gerealiseerde edge" value={pct(s.total.realizedEdge)} />
        <Kpi label="Inzetten" value={String(s.total.bets)} />
      </div>

      {/* Per game */}
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <GameCard stat={s.crash} />
        <GameCard stat={s.mines} />
      </div>

      {/* Stortingen + Opnames */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 26, marginBottom: 12, color: 'var(--text-primary)' }}>Stortingen &amp; Opnames</h2>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        <Kpi label="Ingestort (goedgekeurd)" value={eur(s.deposits.approvedAmount)} accent="var(--accent-green)" />
        <Kpi label="Stortingen in afwachting" value={String(s.deposits.pending)} accent="var(--accent-yellow)" />
        <Kpi label="Uitbetaald (opnames)" value={eur(s.deposits.withdrawalApprovedAmount)} accent="var(--accent-red)" />
        <Kpi label="Opnames in behandeling" value={String(s.deposits.withdrawalPending)} accent="var(--accent-yellow)" />
        <Kpi label="Netto kas" value={eur(s.deposits.approvedAmount - s.deposits.withdrawalApprovedAmount)}
          accent={(s.deposits.approvedAmount - s.deposits.withdrawalApprovedAmount) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
      </div>

      {/* Gebruikers */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 26, marginBottom: 12, color: 'var(--text-primary)' }}>Gebruikers</h2>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
              {['Gebruiker', 'E-mail', 'Saldo', 'Rol', 'Crash rondes', 'Mines spellen', 'Lid sinds'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>{u.username}</td>
                <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '9px 14px', color: 'var(--accent-green)', fontWeight: 700 }}>{eur(u.balance)}</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: u.role === 'ADMIN' ? 'rgba(237,66,69,0.15)' : 'rgba(255,255,255,0.06)',
                    color: u.role === 'ADMIN' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{u._count.crashRounds}</td>
                <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{u._count.minesGames}</td>
                <td style={{ padding: '9px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(u.createdAt).toLocaleDateString('nl-NL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

function GameCard({ stat }: { stat: GameStat }) {
  const edgeDelta = stat.realizedEdge - stat.configuredEdge;
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{stat.name}</h3>
        <span style={{ fontSize: 12, fontWeight: 600, color: stat.configuredEdge > 0 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
          ingestelde edge {pct(stat.configuredEdge)}
        </span>
      </div>
      <Row label="Ingezet" value={eur(stat.wagered)} />
      <Row label="Uitbetaald" value={eur(stat.won)} />
      <Row label="Huiswinst (GGR)" value={eur(stat.ggr)} color={stat.ggr >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
      <Row label="RTP" value={pct(stat.rtp)} />
      <Row label="Gerealiseerde edge" value={pct(stat.realizedEdge)} hint={`vs ${pct(stat.configuredEdge)} ingesteld (${edgeDelta >= 0 ? '+' : ''}${(edgeDelta * 100).toFixed(2)}%)`} />
      <Row label="Inzetten" value={`${stat.bets} (${stat.wins} win / ${stat.losses} verlies)`} />
      <Row label="Gem. inzet" value={eur(stat.avgBet)} />
      <Row label="Grootste uitbetaling" value={eur(stat.biggestPayout)} color="var(--accent-green)" />
    </div>
  );
}

function Row({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--text-primary)', textAlign: 'right' }}>
        {value}
        {hint && <span style={{ display: 'block', fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>{hint}</span>}
      </span>
    </div>
  );
}
