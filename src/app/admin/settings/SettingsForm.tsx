'use client';

import { useState } from 'react';
import type { Config, GameConfig } from '@/lib/settings';

type LocalGame = {
  houseEdgePct: string; // weergave als percentage, bijv. "1.00"
  minBet: string;
  maxBet: string;
  enabled: boolean;
};

export default function SettingsForm({ initialConfig }: { initialConfig: Config }) {
  const [crash, setCrash] = useState<LocalGame>(toLocal(initialConfig.crash));
  const [mines, setMines] = useState<LocalGame>(toLocal(initialConfig.mines));
  const [saving, setSaving] = useState('');
  const [msg, setMsg] = useState('');

  async function save(game: 'crash' | 'mines', local: LocalGame) {
    setSaving(game); setMsg('');
    const he = parseFloat(local.houseEdgePct) / 100;
    const min = parseFloat(local.minBet);
    const max = parseFloat(local.maxBet);
    if (isNaN(he) || he < 0 || he > 0.5) { setMsg('House edge moet tussen 0% en 50% zijn.'); setSaving(''); return; }
    if (isNaN(min) || isNaN(max) || min < 0 || max < min) { setMsg('Controleer de inzet-limieten.'); setSaving(''); return; }

    const config: Partial<GameConfig> = {
      houseEdge: he,
      minBet: min,
      maxBet: max,
      enabled: local.enabled,
    };
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, config }),
    });
    setSaving('');
    if (res.ok) setMsg(`${game === 'crash' ? 'Crash' : 'Mines'} opgeslagen.`);
    else { const b = await res.json().catch(() => ({})); setMsg(b.error || 'Opslaan mislukt.'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && <div style={{ fontSize: 13, fontWeight: 600, color: msg.includes('opgeslagen') ? 'var(--accent-green)' : 'var(--accent-red)' }}>{msg}</div>}

      <GamePanel title="Crash" game="crash" state={crash} setState={setCrash} saving={saving === 'crash'} onSave={() => save('crash', crash)} />
      <GamePanel title="Mines" game="mines" state={mines} setState={setMines} saving={saving === 'mines'} onSave={() => save('mines', mines)} />
    </div>
  );
}

function toLocal(g: GameConfig): LocalGame {
  return {
    houseEdgePct: (g.houseEdge * 100).toFixed(2),
    minBet: String(g.minBet),
    maxBet: String(g.maxBet),
    enabled: g.enabled,
  };
}

function GamePanel({
  title, state, setState, saving, onSave,
}: {
  title: string; game: string; state: LocalGame; setState: (l: LocalGame) => void; saving: boolean; onSave: () => void;
}) {
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
  };
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => setState({ ...state, enabled: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: 'var(--accent-green)' }}
          />
          Actief
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div>
          <div style={label}>House edge (%)</div>
          <input className="input" type="number" step="0.01" min="0" max="50" value={state.houseEdgePct}
            onChange={(e) => setState({ ...state, houseEdgePct: e.target.value })} />
        </div>
        <div>
          <div style={label}>Min inzet (€)</div>
          <input className="input" type="number" step="0.01" min="0" value={state.minBet}
            onChange={(e) => setState({ ...state, minBet: e.target.value })} />
        </div>
        <div>
          <div style={label}>Max inzet (€)</div>
          <input className="input" type="number" step="0.01" min="0" value={state.maxBet}
            onChange={(e) => setState({ ...state, maxBet: e.target.value })} />
        </div>
      </div>

      <button className="btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={saving} onClick={onSave}>
        {saving ? 'Opslaan…' : `${title} opslaan`}
      </button>
    </div>
  );
}
