'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: 24 }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Er ging iets mis</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, maxWidth: 420 }}>
        {error.message || 'Onverwachte fout bij het laden van deze pagina.'}
      </p>
      <button className="wallet-btn" onClick={reset}>Opnieuw proberen</button>
    </div>
  );
}
