import Link from 'next/link';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 20px 80px', display: 'flex', flexDirection: 'column', gap: 64 }}>

      {/* Hero */}
      <section style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
          padding: '5px 14px', borderRadius: 999,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
          iDEAL stortingen via Tikkie
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.5px', color: 'var(--text-primary)', margin: '0 0 18px' }}>
          Speel eerlijk.<br />
          <span style={{ color: 'var(--accent-green)' }}>Win slim.</span>
        </h1>

        <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.7 }}>
          Stort veilig via Tikkie. Je betaling wordt handmatig geverifieerd en je saldo staat direct klaar.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {session ? (
            <>
              <Link href="/mines" className="btn-primary" style={{ textDecoration: 'none', fontSize: 15, padding: '13px 28px' }}>
                Speel Mines
              </Link>
              <Link href="/crash" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 15, padding: '13px 28px' }}>
                Crash
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className="btn-primary" style={{ textDecoration: 'none', fontSize: 15, padding: '13px 28px' }}>
                Account aanmaken
              </Link>
              <Link href="/login" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 15, padding: '13px 28px' }}>
                Inloggen
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Feature
          label="Storten"
          title="iDEAL via Tikkie"
          desc="Betaal met je bankapp en upload het betalingsbewijs. Wij controleren en creditten je saldo."
        />
        <Feature
          label="Verificatie"
          title="Handmatige controle"
          desc="Een admin beoordeelt elke storting en opname. Geen geautomatiseerde fouten."
        />
        <Feature
          label="Games"
          title="Mines & Crash"
          desc="Onthul tegels en bouw je multiplier op, of cash uit in Crash voordat de ronde eindigt."
        />
      </section>
    </div>
  );
}

function Feature({ label, title, desc }: { label: string; title: string; desc: string }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}
