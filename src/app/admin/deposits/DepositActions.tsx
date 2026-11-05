'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DepositActions({
  depositId,
  amount,
  username,
}: {
  depositId: string;
  amount: number;
  username: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  async function act(action: 'approve' | 'reject') {
    setError('');
    const verb = action === 'approve' ? 'goedkeuren' : 'afkeuren';
    if (!confirm(`Storting van €${amount.toFixed(2)} van ${username} ${verb}?`)) return;
    setLoading(action);
    const res = await fetch(`/api/deposits/${depositId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setLoading('');
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || `${verb} mislukt.`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
      <input
        type="text"
        placeholder="Opmerking voor gebruiker (optioneel bij afkeuren)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="input"
        style={{ fontSize: 13 }}
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
