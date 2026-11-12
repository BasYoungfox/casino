import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { minesMultiplier } from '@/lib/minesMath';
import { getSettingNumber } from '@/lib/settings';
import { recordMinesCycle } from '@/lib/cycleRecord';

export async function POST(
  req: Request,
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

  const body = await req.json().catch(() => ({}));
  const tile = Math.round(Number(body.tile));
  if (!Number.isInteger(tile) || tile < 0 || tile >= game.totalTiles) {
    return NextResponse.json({ error: 'Ongeldige tegel.' }, { status: 400 });
  }

  const minePositions: number[] = JSON.parse(game.minePositions);
  const revealed: number[] = JSON.parse(game.revealed);
  if (revealed.includes(tile)) {
    return NextResponse.json({ error: 'Deze tegel is al onthuld.' }, { status: 400 });
  }

  const isMine = minePositions.includes(tile);

  // BUSTED
  if (isMine) {
    await prisma.minesGame.update({
      where: { id: game.id },
      data: { status: 'BUSTED' },
    });
    recordMinesCycle({ userId: game.userId, betAmount: game.betAmount, outcome: 'LOSS', payout: 0 }).catch(() => {});
    return NextResponse.json({
      busted: true,
      tile,
      minePositions,
      revealed,
    });
  }

  // SAFE
  revealed.push(tile);
  revealed.sort((a, b) => a - b);
  const picks = revealed.length;
  const safeTilesTotal = game.totalTiles - game.minesCount;
  const houseEdge = await getSettingNumber('game.mines.houseEdge', 0.01);
  const newMultiplier = minesMultiplier(picks, game.minesCount, game.totalTiles, houseEdge);

  // Laatste safe tegel gevonden → automatisch winst (alles overige zijn mijnen).
  if (picks >= safeTilesTotal) {
    const payout = game.betAmount * newMultiplier;
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: game.userId } });
      if (!fresh) throw new Error('Gebruiker niet gevonden.');
      const balance = fresh.balance + payout;
      await tx.user.update({ where: { id: game.userId }, data: { balance } });
      await tx.minesGame.update({
        where: { id: game.id },
        data: { revealed: JSON.stringify(revealed), multiplier: newMultiplier, status: 'CASHED_OUT', payout },
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
    // Auto-win on last tile
    recordMinesCycle({ userId: game.userId, betAmount: game.betAmount, outcome: 'WIN', payout }).catch(() => {});
    return NextResponse.json({
      safe: true,
      tile,
      multiplier: newMultiplier,
      picks,
      picksRemaining: 0,
      autoCashedOut: true,
      payout,
      minePositions,
      newBalance: result,
    });
  }

  // Gewone safe pick
  await prisma.minesGame.update({
    where: { id: game.id },
    data: { revealed: JSON.stringify(revealed), multiplier: newMultiplier },
  });

  return NextResponse.json({
    safe: true,
    tile,
    multiplier: newMultiplier,
    picks,
    picksRemaining: safeTilesTotal - picks,
  });
}
