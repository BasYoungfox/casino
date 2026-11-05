'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="nl">
      <body style={{ margin: 0, background: '#0f1923', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Er ging iets mis</h2>
          <p style={{ color: '#b1bad3', fontSize: 13, marginBottom: 20, maxWidth: 420 }}>
            {error.message || 'Onverwachte fout.'}
          </p>
          <button
            onClick={reset}
            style={{ background: '#213743', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Opnieuw proberen
          </button>
        </div>
      </body>
    </html>
  );
}
