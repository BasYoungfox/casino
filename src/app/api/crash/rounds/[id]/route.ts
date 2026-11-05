import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { multiplierAt, timeToReach } from '@/lib/crashMath';

type Phase = 'running' | 'cashed_out' | 'crashed';

export async function GET(
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
  if (round.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }

  // Al al beoordeeld? Geef direct het eindresultaat.
  if (round.status === 'CASHED_OUT') {
    return NextResponse.json({
      phase: 'cashed_out' as Phase,
      multiplier: round.cashoutMultiplier,
      payout: round.payout,
      crashedAt: null,
      betAmount: round.betAmount,
    });
  }
  if (round.status === 'CRASHED') {
    return NextResponse.json({
      phase: 'crashed' as Phase,
      multiplier: round.crashPoint,
      payout: 0,
      betAmount: round.betAmount,
    });
  }

  // status === RUNNING: bepaal waar we nu zijn.
  const now = Date.now();
  const elapsed = now - round.startTime.getTime();
  const currentMult = multiplierAt(elapsed);

  // 1) Is de ronde al gecrasht?
  if (elapsed >= round.crashTimeMs) {
    await prisma.crashRound.update({
      where: { id: round.id },
      data: { status: 'CRASHED' },
    });
    return NextResponse.json({
      phase: 'crashed' as Phase,
      multiplier: round.crashPoint,
      payout: 0,
      betAmount: round.betAmount,
    });
  }

  // 2) Auto-cashout bereikt (vóór de crash)?
  if (round.autoCashout && currentMult >= round.autoCashout) {
    const payout = round.betAmount * round.autoCashout;
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: round.userId } });
      if (!fresh) throw new Error('Gebruiker niet gevonden.');
      const newBalance = fresh.balance + payout;
      await tx.user.update({
        where: { id: round.userId },
        data: { balance: newBalance },
      });
      await tx.crashRound.update({
        where: { id: round.id },
        data: {
          status: 'CASHED_OUT',
          cashoutMultiplier: round.autoCashout,
          payout,
        },
      });
      await tx.transaction.create({
        data: {
          userId: round.userId,
          type: 'CRASH_WIN',
          amount: payout,
          balanceAfter: newBalance,
          crashRoundId: round.id,
        },
      });
      return newBalance;
    });
    return NextResponse.json({
      phase: 'cashed_out' as Phase,
      multiplier: round.autoCashout,
      payout,
      betAmount: round.betAmount,
    });
  }

  // 3) Nog running.
  return NextResponse.json({
    phase: 'running' as Phase,
    multiplier: Math.min(currentMult, round.crashPoint - 0.01),
    payout: null,
    betAmount: round.betAmount,
  });
}
