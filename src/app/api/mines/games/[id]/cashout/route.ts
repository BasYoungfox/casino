import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordMinesCycle } from '@/lib/cycleRecord';

export async function POST(
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
  if (game.userId !== user.id) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }
  if (game.status !== 'RUNNING') {
    return NextResponse.json({ error: 'Dit spel is al afgelopen.' }, { status: 400 });
  }
  if (JSON.parse(game.revealed).length === 0) {
    return NextResponse.json({ error: 'Onthul minstens één tegel.' }, { status: 400 });
  }

  const payout = game.betAmount * game.multiplier;
  const minePositions = JSON.parse(game.minePositions);

  const newBalance = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: game.userId } });
    if (!fresh) throw new Error('Gebruiker niet gevonden.');
    const balance = fresh.balance + payout;
    await tx.user.update({ where: { id: game.userId }, data: { balance } });
    await tx.minesGame.update({
      where: { id: game.id },
      data: { status: 'CASHED_OUT', payout },
    });
    await tx.transaction.create({
      data: {
        userId: game.userId,
        type: 'MINES_WIN',
        amount: payout,
        balanceAfter: balance,
      },
    });
    return balance;
  });

  recordMinesCycle({ userId: game.userId, betAmount: game.betAmount, outcome: 'WIN', payout }).catch(() => {});

  return NextResponse.json({
    ok: true,
    payout,
    multiplier: game.multiplier,
    minePositions,
    newBalance,
  });
}
