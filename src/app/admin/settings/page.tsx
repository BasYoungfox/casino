import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getGameConfig, type Config } from '@/lib/settings';
import AdminNav from '@/components/layout/AdminNav';
import SettingsForm from './SettingsForm';

export default async function AdminSettings() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const config = await getGameConfig();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Admin</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 18 }}>
        Instellingen — house edges, limieten &amp; games aan/uit
      </p>
      <AdminNav active="/admin/settings" />
      <SettingsForm initialConfig={config} />
    </div>
  );
}
