'use client';

import { useState } from 'react';
import type { CycleConfig } from '@/lib/cycleEngine';

export default function CycleSettings({ initialConfig }: { initialConfig: CycleConfig }) {
  const [cfg, setCfg] = useState({
    enabled: initialConfig.enabled,
    targetProfit: String(initialConfig.targetProfitPerCycle),
    houseBuffer: String(initialConfig.houseBuffer),
    cycleSize: String(initialConfig.cycleSize),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cycle',
        config: {
          enabled: cfg.enabled,
          targetProfitPerCycle: parseFloat(cfg.targetProfit),
          houseBuffer: parseFloat(cfg.houseBuffer),
          cycleSize: parseInt(cfg.cycleSize),
        },
      }),
    });
    setSaving(false);
    setMsg(res.ok ? 'Opgeslagen.' : 'Opslaan mislukt.');
  }

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block',
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Parameters</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            style={{ width: 15, height: 15, accentColor: 'var(--accent-green)' }} />
          Correctie-engine actief
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <span style={label}>Doel-winst per cyclus (€)</span>
          <input className="input" type="number" step="0.01" min="0" value={cfg.targetProfit}
            onChange={(e) => setCfg({ ...cfg, targetProfit: e.target.value })} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Min. huis-winst na elke {cfg.cycleSize} bets</p>
        </div>
        <div>
          <span style={label}>Start-buffer (€)</span>
          <input className="input" type="number" step="0.01" min="0" value={cfg.houseBuffer}
            onChange={(e) => setCfg({ ...cfg, houseBuffer: e.target.value })} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Initieel verwacht voordeel</p>
        </div>
        <div>
          <span style={label}>Cyclus-grootte (bets)</span>
          <input className="input" type="number" step="1" min="5" max="200" value={cfg.cycleSize}
            onChange={(e) => setCfg({ ...cfg, cycleSize: e.target.value })} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Na hoeveel bets checken we?</p>
        </div>
      </div>

      <div style={{ padding: '12px 14px', background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Wat er gebeurt:</strong> Alle bets zijn random. Na elke <strong>{cfg.cycleSize}</strong> bets wordt gecontroleerd of het huis minstens <strong>€{cfg.targetProfit}</strong> heeft gewonnen. Zo niet, dan crasht de <em>volgende</em> bet gegarandeerd vroeg (1.01–1.49×) of ligt de eerste mijn op tegel 0 — zodat de speler vrijwel zeker verliest. Daarna is de cyclus weer volledig random.
      </div>

      {msg && <p style={{ fontSize: 13, fontWeight: 600, color: msg.includes('Opgeslagen') ? 'var(--accent-green)' : 'var(--accent-red)' }}>{msg}</p>}

      <button className="btn-primary" onClick={save} disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Opslaan...' : 'Instellingen opslaan'}
      </button>
    </div>
  );
}
