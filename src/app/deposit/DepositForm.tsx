'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DepositForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const amount = parseFloat(String(data.get('amount')));
    if (!amount || amount <= 0) {
      setError('Vul een geldig bedrag in.');
      return;
    }
    const file = data.get('proof') as File | null;
    if (!file || file.size === 0) {
      setError('Upload je betalingsbewijs.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Bestand is te groot (max 8 MB).');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/deposits', { method: 'POST', body: data });
    setLoading(false);

    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Storing indienen mislukt.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="label" htmlFor="amount">Bedrag (€)</label>
        <input id="amount" name="amount" type="number" step="0.01" min="1" className="input" placeholder="bijv. 25.00" required />
      </div>

      <div>
        <label className="label" htmlFor="proof">Betalingsbewijs</label>
        <input
          id="proof"
          name="proof"
          type="file"
          accept="image/*,application/pdf"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
          style={{
            width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--text-secondary)',
            fontSize: 14, outline: 'none',
          }}
        />
        {fileName && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>Geselecteerd: {fileName}</p>}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Afbeelding of PDF, max 8 MB.</p>
      </div>

      <div>
        <label className="label" htmlFor="note">Opmerking (optioneel)</label>
        <textarea
          id="note"
          name="note"
          className="input"
          rows={2}
          placeholder="bijv. betaald via Tikkie om 14:32"
          style={{ resize: 'vertical' }}
        />
      </div>

      {error && <p style={{ fontSize: 13, color: 'var(--accent-red)' }}>{error}</p>}

      <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Bezig...' : 'Storing indienen'}
      </button>
    </form>
  );
}
