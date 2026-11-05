import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CrashGame from '@/components/games/crash/CrashGame';

export const metadata: Metadata = {
  title: 'Casino | Crash',
  description: 'Crash — betaal uit voordat de multiplier crasht.',
};

export default async function CrashPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rounds = await prisma.crashRound.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: { crashPoint: true },
  });

  return (
    <div className="game-page-wrapper">
      <CrashGame initialHistory={rounds.map((r) => r.crashPoint)} />
    </div>
  );
}
