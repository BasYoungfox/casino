'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WithdrawalActions({
  id, amount, username,
}: { id: string; amount: number; username: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  async function act(action: 'approve' | 'reject') {
    setError('');
    const verb = action === 'approve' ? 'goedkeuren' : 'afkeuren';
    if (!confirm(`Opname van €${amount.toFixed(2)} van ${username} ${verb}?`)) return;
    setLoading(action);
    const res = await fetch(`/api/withdrawals/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setLoading('');
    if (res.ok) {
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error || `${verb} mislukt.`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input type="text" className="input" style={{ fontSize: 13 }}
        placeholder="Opmerking voor gebruiker (optioneel)"
        value={note} onChange={(e) => setNote(e.target.value)}
      />
      {error && <p style={{ fontSize: 12, color: 'var(--accent-red)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-success" style={{ flex: 1 }} disabled={!!loading} onClick={() => act('approve')}>
          {loading === 'approve' ? 'Bezig…' : '✓ Goedkeuren'}
        </button>
        <button className="btn-danger" style={{ flex: 1 }} disabled={!!loading} onClick={() => act('reject')}>
          {loading === 'reject' ? 'Bezig…' : '✕ Afkeuren'}
        </button>
      </div>
    </div>
  );
}
