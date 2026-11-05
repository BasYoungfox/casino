import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const game = await prisma.minesGame.findUnique({ where: { id: params.id } });
  if (!game) {
    return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });
  }
  if (game.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }

  const running = game.status === 'RUNNING';
  return NextResponse.json({
    status: game.status,
    betAmount: game.betAmount,
    minesCount: game.minesCount,
    totalTiles: game.totalTiles,
    multiplier: game.multiplier,
    revealed: JSON.parse(game.revealed),
    // mijnen alleen tonen als het spel afgelopen is
    minePositions: running ? null : JSON.parse(game.minePositions),
    payout: game.payout,
  });
}
