import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DepositForm from './DepositForm';

export default async function DepositPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tikkieLink = process.env.TIKKIE_LINK || 'https://tikkie.me/jouw-tikkie-link';

  const steps = [
    'Vul hieronder in hoeveel je wilt storten.',
    'Klik op de Tikkie-link en betaal het bedrag met iDEAL. Bewaar je betalingsbevestiging (screenshot of PDF).',
    'Upload je betalingsbewijs. Wij controleren het en creditten je saldo zodra het klopt.',
  ];

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 18, color: 'var(--text-primary)' }}>
        Saldo toevoegen
      </h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--accent-orange)' }}>
          Hoe storten werkt
        </h2>
        <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0, margin: 0, listStyle: 'none' }}>
          {steps.map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 2 }}>{s}</span>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
          <a href={tikkieLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: '100%' }}>
            Open Tikkie ↗
          </a>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, wordBreak: 'break-all' }}>{tikkieLink}</p>
        </div>
      </div>

      <DepositForm />
    </div>
  );
}
