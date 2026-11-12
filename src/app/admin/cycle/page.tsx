import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCycleStats, BASE_PATTERN } from '@/lib/cycleEngine';
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
        Bet-cyclus — gecontroleerde uitbetalingsflow
      </p>
      <AdminNav active="/admin/cycle" />

      {/* Status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: config.enabled ? 'rgba(0,231,1,0.06)' : 'rgba(237,66,69,0.08)', border: `1px solid ${config.enabled ? 'rgba(0,231,1,0.2)' : 'rgba(237,66,69,0.2)'}` }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: config.enabled ? 'var(--accent-green)' : 'var(--accent-red)', flexShrink: 0, ...(config.enabled ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}) }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: config.enabled ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          Cyclus {config.enabled ? 'ACTIEF' : 'UITGESCHAKELD'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>
          Doel: €{config.targetProfitPerCycle} winst per {config.cycleSize} inzetten · Start-buffer €{config.houseBuffer} · Winst-multiplier {config.winMultiplier}×
        </span>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
        <Kpi label="Huidige cyclus" value={`#${stats.currentCycleNumber}`} />
        <Kpi label="Positie in cyclus" value={`${stats.positionInCycle} / ${config.cycleSize}`} />
        <Kpi label="Totale inzetten" value={String(stats.totalBets)} />
        <Kpi label="Voltooide cycli" value={String(stats.cyclesCompleted)} />
        <Kpi label="Huis winst (werkelijk)" value={eur(stats.totalProfit)} accent={stats.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <Kpi label="Huis winst (verwacht)" value={eur(stats.expectedProfit)} />
        <Kpi label="Verschil" value={`${stats.profitVsExpected >= 0 ? '+' : ''}${eur(stats.profitVsExpected)}`} accent={Math.abs(stats.profitVsExpected) < 5 ? 'var(--accent-green)' : 'var(--accent-yellow)'} />
        <Kpi label="Volgende slot" value={stats.nextSlotWins ? 'WIN' : 'VERLIES'} accent={stats.nextSlotWins ? 'var(--accent-green)' : 'var(--accent-red)'} />
      </div>

      {/* Current cycle grid — 25 slots visual */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        Cyclus #{stats.currentCycleNumber} — voortgang
      </h2>
      <div className="card" style={{ padding: '16px', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(25, 1fr)', gap: 4 }}>
          {BASE_PATTERN.map((win, i) => {
            const slot = i + 1;
            const played = currentCycleBets.find((b) => b.betInCycle === slot);
            const isCurrent = slot === stats.positionInCycle && !played;
            let bg = 'var(--bg-tertiary)';
            let color = 'var(--text-muted)';
            let title = `Slot ${slot}: ${win ? 'gepland WIN' : 'gepland VERLIES'}`;
            if (played) {
              bg = played.outcome === 'WIN' ? 'rgba(0,231,1,0.2)' : 'rgba(237,66,69,0.2)';
              color = played.outcome === 'WIN' ? 'var(--accent-green)' : 'var(--accent-red)';
              title = `Slot ${slot}: ${played.outcome} €${played.betAmount.toFixed(2)} → ${played.outcome === 'WIN' ? '+' : '-'}€${Math.abs(played.profit).toFixed(2)}`;
            } else if (isCurrent) {
              bg = 'rgba(255,193,7,0.2)';
              color = 'var(--accent-yellow)';
              title = `Slot ${slot}: VOLGENDE — ${win ? 'WIN' : 'VERLIES'}`;
            }
            return (
              <div key={i} title={title} style={{ aspectRatio: '1', borderRadius: 4, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color, cursor: 'default', border: isCurrent ? '1px solid var(--accent-yellow)' : '1px solid transparent' }}>
                {slot}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0,231,1,0.2)', display: 'inline-block' }} />Gespeeld WIN</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(237,66,69,0.2)', display: 'inline-block' }} />Gespeeld VERLIES</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,193,7,0.2)', border: '1px solid var(--accent-yellow)', display: 'inline-block' }} />Volgende</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg-tertiary)', display: 'inline-block' }} />Nog niet gespeeld</span>
        </div>
      </div>

      {/* Cycle history table */}
      {stats.cycleHistory.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Cyclus-geschiedenis</h2>
          <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Cyclus</th>
                  <th style={th}>Inzetten</th>
                  <th style={th}>Totaal ingezet</th>
                  <th style={th}>Uitbetaald</th>
                  <th style={th}>Huis winst</th>
                  <th style={th}>Doel</th>
                  <th style={th}>Verschil</th>
                </tr>
              </thead>
              <tbody>
                {stats.cycleHistory.map((c) => {
                  const diff = c.profit - config.targetProfitPerCycle;
                  const complete = c.bets >= config.cycleSize;
                  return (
                    <tr key={c.cycleNumber}>
                      <td style={td({ fontWeight: 700 })}>#{c.cycleNumber}</td>
                      <td style={td({ color: 'var(--text-secondary)' })}>{c.bets}{complete ? '' : ` / ${config.cycleSize}`}</td>
                      <td style={td()}>{eur(c.wagered)}</td>
                      <td style={td()}>{eur(c.paid)}</td>
                      <td style={td({ fontWeight: 700, color: c.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' })}>{eur(c.profit)}</td>
                      <td style={td({ color: 'var(--text-muted)' })}>{complete ? eur(config.targetProfitPerCycle) : '—'}</td>
                      <td style={td({ fontWeight: 600, color: Math.abs(diff) < 2 ? 'var(--accent-green)' : 'var(--accent-yellow)' })}>
                        {complete ? `${diff >= 0 ? '+' : ''}${eur(diff)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
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
