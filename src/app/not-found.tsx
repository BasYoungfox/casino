import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: 24 }}>
      <h1 style={{ fontSize: 64, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>404</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Deze pagina bestaat niet.</p>
      <Link href="/" className="wallet-btn" style={{ textDecoration: 'none' }}>Terug naar home</Link>
    </div>
  );
}
