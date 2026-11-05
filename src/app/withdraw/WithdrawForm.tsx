'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WithdrawForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [tikkieUrl, setTikkieUrl] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const canSubmit = confirmed && amountNum > 0 && amountNum <= balance && tikkieUrl.startsWith('https://tikkie.me/');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!confirmed) { setError('Bevestig dat je Tikkie open-prijs staat.'); return; }
    setLoading(true);
    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountNum, tikkieUrl, note }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error || 'Opname aanvragen mislukt.');
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Saldo info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Beschikbaar saldo</span>
        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>€ {balance.toFixed(2)}</span>
      </div>

      {/* Bedrag */}
      <div>
        <label style={labelStyle} htmlFor="amount">Bedrag (€)</label>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 12px', gap: 8 }}>
          <input
            id="amount" type="number" step="0.01" min="5" max={balance}
            placeholder="bijv. 25.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 16, fontWeight: 500, fontFamily: 'inherit' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>€</span>
          <button type="button" onClick={() => setAmount(balance.toFixed(2))}
            style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Max
          </button>
        </div>
      </div>

      {/* Tikkie URL */}
      <div>
        <label style={labelStyle} htmlFor="tikkieUrl">Jouw Tikkie-link</label>
        <input
          id="tikkieUrl" type="url" className="input"
          placeholder="https://tikkie.me/pay/..."
          value={tikkieUrl}
          onChange={(e) => setTikkieUrl(e.target.value)}
        />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Ga naar de Tikkie app → maak een link aan → zet hem op <strong style={{ color: 'var(--text-secondary)' }}>open prijs</strong> → kopieer de link hierboven.
        </p>
      </div>

      {/* Opmerking */}
      <div>
        <label style={labelStyle} htmlFor="note">Opmerking (optioneel)</label>
        <textarea id="note" className="input" rows={2}
          placeholder="bijv. rekeninghouder: Jan Jansen"
          value={note} onChange={(e) => setNote(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Open prijs bevestiging */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.25)', borderRadius: 'var(--radius-md)' }}>
        <input
          type="checkbox" id="confirmOpen"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--accent-green)', flexShrink: 0, cursor: 'pointer' }}
        />
        <label htmlFor="confirmOpen" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, cursor: 'pointer' }}>
          Ik bevestig dat mijn Tikkie-link op <strong style={{ color: 'var(--accent-yellow)' }}>open prijs</strong> staat.
        </label>
      </div>

      {error && <p style={{ fontSize: 13, color: 'var(--accent-red)', fontWeight: 600 }}>{error}</p>}

      <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading || !canSubmit}>
        {loading ? 'Bezig...' : `Opname aanvragen · €${amountNum > 0 ? amountNum.toFixed(2) : '0.00'}`}
      </button>
    </form>
  );
}
