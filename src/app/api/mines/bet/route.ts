import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateMines, TOTAL_TILES } from '@/lib/minesMath';
import { getGameConfig } from '@/lib/settings';
import { getCycleConfig, getSlotOverride, forcedLossMines } from '@/lib/cycleEngine';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const cfg = await getGameConfig();
  const gc = cfg.mines;
  if (!gc.enabled) {
    return NextResponse.json({ error: 'Mines is momenteel uitgeschakeld.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const minesCount = Math.round(Number(body.minesCount));

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Ongeldig bedrag.' }, { status: 400 });
  }
  if (amount < gc.minBet) {
    return NextResponse.json({ error: `Minimum inzet is €${gc.minBet}.` }, { status: 400 });
  }
  if (amount > gc.maxBet) {
    return NextResponse.json({ error: `Maximum inzet is €${gc.maxBet}.` }, { status: 400 });
  }
  if (amount > user.balance) {
    return NextResponse.json({ error: 'Onvoldoende saldo.' }, { status: 400 });
  }
  if (!minesCount || minesCount < 1 || minesCount >= TOTAL_TILES) {
    return NextResponse.json({ error: `Aantal mijnen moet 1 t/m ${TOTAL_TILES - 1} zijn.` }, { status: 400 });
  }

  const minePositions = await (async () => {
    const cycleConfig = await getCycleConfig();
    if (cycleConfig.enabled) {
      const { forceLoss } = await getSlotOverride();
      if (forceLoss) return forcedLossMines(minesCount, TOTAL_TILES);
    }
    return generateMines(minesCount, TOTAL_TILES);
  })();

  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: user.id } });
    if (!fresh) throw new Error('Gebruiker niet gevonden.');
    if (amount > fresh.balance) throw new Error('Onvoldoende saldo.');

    const newBalance = fresh.balance - amount;

    const game = await tx.minesGame.create({
      data: {
        userId: user.id,
        betAmount: amount,
        minesCount,
        totalTiles: TOTAL_TILES,
        minePositions: JSON.stringify(minePositions),
        revealed: '[]',
        status: 'RUNNING',
        multiplier: 1,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'MINES_BET',
        amount: -amount,
        balanceAfter: newBalance,
      },
    });

    return { game, newBalance };
  });

  // Geef NOOIT minePositions terug aan de client zolang het spel loopt.
  return NextResponse.json({
    gameId: result.game.id,
    minesCount,
    totalTiles: TOTAL_TILES,
  });
}
