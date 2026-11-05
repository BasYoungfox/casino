import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import MinesGame from '@/components/games/mines/MinesGame';

export const metadata: Metadata = {
  title: 'Casino | Mines',
  description: 'Mines — provably fair.',
};

export default async function MinesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="game-page-wrapper">
      <MinesGame />
    </div>
  );
}
