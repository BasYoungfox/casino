import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateCrashPoint, timeToReach } from '@/lib/crashMath';
import { getGameConfig } from '@/lib/settings';
import { getCycleConfig, getSlotOverride, forcedLossCrashPoint } from '@/lib/cycleEngine';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const [cfg, cycleConfig] = await Promise.all([getGameConfig(), getCycleConfig()]);
  const gc = cfg.crash;
  if (!gc.enabled) {
    return NextResponse.json({ error: 'Crash is momenteel uitgeschakeld.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const autoCashout = body.autoCashout ? Number(body.autoCashout) : null;

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
  if (autoCashout !== null && !(autoCashout > 1.01)) {
    return NextResponse.json({ error: 'Auto cashout moet boven 1.01× zijn.' }, { status: 400 });
  }

  // Determine crash point: fully random, unless a correction bet is due
  const { forceLoss } = cycleConfig.enabled
    ? await getSlotOverride()
    : { forceLoss: false };

  const crashPoint = forceLoss
    ? forcedLossCrashPoint()
    : generateCrashPoint(gc.houseEdge);

  const crashTimeMs = Math.round(timeToReach(crashPoint));
  const startTime = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: user.id } });
    if (!fresh) throw new Error('Gebruiker niet gevonden.');
    if (amount > fresh.balance) throw new Error('Onvoldoende saldo.');
    const newBalance = fresh.balance - amount;

    const round = await tx.crashRound.create({
      data: {
        userId: user.id,
        betAmount: amount,
        crashPoint,
        startTime,
        crashTimeMs,
        status: 'RUNNING',
        autoCashout,
      },
    });

    await tx.user.update({ where: { id: user.id }, data: { balance: newBalance } });
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'CRASH_BET',
        amount: -amount,
        balanceAfter: newBalance,
        crashRoundId: round.id,
      },
    });

    return { round, newBalance };
  });

  return NextResponse.json({
    roundId: result.round.id,
    startTime: startTime.toISOString(),
    serverTime: new Date().toISOString(),
  });
}
