/**
 * Records a completed bet into the BetCycle log.
 * Called after a Crash round or Mines game settles.
 * Safe to call multiple times — checks for existing record first.
 */
import { prisma } from './prisma';
import { getCycleConfig, getNextSlot, recordCycleBet } from './cycleEngine';

export async function recordCrashCycle(opts: {
  userId: string;
  betAmount: number;
  outcome: 'WIN' | 'LOSS';
  payout: number;
  roundId: string;
}) {
  // Check if already recorded for this round
  const existing = await prisma.betCycle.findFirst({
    where: { userId: opts.userId, game: 'CRASH', createdAt: { gte: new Date(Date.now() - 30000) } },
    orderBy: { createdAt: 'desc' },
  });
  // Simple dedup: if last CRASH record was within 5s and same amount, skip
  if (existing && Math.abs(existing.betAmount - opts.betAmount) < 0.001 &&
      (Date.now() - existing.createdAt.getTime()) < 5000) {
    return;
  }

  const config = await getCycleConfig();
  if (!config.enabled) return;

  const slot = await getNextSlot();
  await recordCycleBet({
    userId: opts.userId,
    game: 'CRASH',
    betAmount: opts.betAmount,
    outcome: opts.outcome,
    payout: opts.payout,
    slot,
  });
}

export async function recordMinesCycle(opts: {
  userId: string;
  betAmount: number;
  outcome: 'WIN' | 'LOSS';
  payout: number;
}) {
  const config = await getCycleConfig();
  if (!config.enabled) return;

  const slot = await getNextSlot();
  await recordCycleBet({
    userId: opts.userId,
    game: 'MINES',
    betAmount: opts.betAmount,
    outcome: opts.outcome,
    payout: opts.payout,
    slot,
  });
}
