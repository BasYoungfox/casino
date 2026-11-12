import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { multiplierAt } from '@/lib/crashMath';
import { recordCrashCycle } from '@/lib/cycleRecord';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const round = await prisma.crashRound.findUnique({
    where: { id: params.id },
  });
  if (!round) {
    return NextResponse.json({ error: 'Ronde niet gevonden.' }, { status: 404 });
  }
  if (round.userId !== user.id) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }

  // Al beoordeeld (handmatig of via auto-cashout)?
  if (round.status === 'CASHED_OUT') {
    return NextResponse.json({
      ok: true,
      multiplier: round.cashoutMultiplier,
      payout: round.payout,
      alreadySettled: true,
    });
  }
  if (round.status === 'CRASHED') {
    return NextResponse.json({
      ok: false,
      error: 'Te laat — de ronde is al gecrasht.',
      multiplier: round.crashPoint,
    });
  }

  // RUNNING: bepaal uitkomst op basis van servertijd.
  const elapsed = Date.now() - round.startTime.getTime();

  if (elapsed >= round.crashTimeMs) {
    // Tussen de laatste poll en deze cashout is de crash gevallen.
    await prisma.crashRound.update({
      where: { id: round.id },
      data: { status: 'CRASHED' },
    });
    return NextResponse.json({
      ok: false,
      error: 'Te laat — crashed!',
      multiplier: round.crashPoint,
    });
  }

  // Winst! multiplier op basis van servertijd (autoritair).
  const multiplier = multiplierAt(elapsed);
  const payout = round.betAmount * multiplier;

  const newBalance = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: round.userId } });
    if (!fresh) throw new Error('Gebruiker niet gevonden.');
    const balance = fresh.balance + payout;
    await tx.user.update({
      where: { id: round.userId },
      data: { balance },
    });
    await tx.crashRound.update({
      where: { id: round.id },
      data: {
        status: 'CASHED_OUT',
        cashoutMultiplier: multiplier,
        payout,
      },
    });
    await tx.transaction.create({
      data: {
        userId: round.userId,
        type: 'CRASH_WIN',
        amount: payout,
        balanceAfter: balance,
        crashRoundId: round.id,
      },
    });
    return balance;
  });

  // Record cycle bet (fire-and-forget, non-blocking)
  recordCrashCycle({ userId: round.userId, betAmount: round.betAmount, outcome: 'WIN', payout, roundId: round.id }).catch(() => {});

  return NextResponse.json({
    ok: true,
    multiplier,
    payout,
    newBalance,
  });
}
