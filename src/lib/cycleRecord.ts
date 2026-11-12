import { getCycleConfig, recordCycleBet } from './cycleEngine';

export async function recordCrashCycle(opts: {
  userId: string;
  betAmount: number;
  outcome: 'WIN' | 'LOSS';
  payout: number;
  roundId: string;
  forced?: boolean;
}) {
  const config = await getCycleConfig();
  if (!config.enabled) return;
  await recordCycleBet({
    userId: opts.userId,
    game: 'CRASH',
    betAmount: opts.betAmount,
    outcome: opts.outcome,
    payout: opts.payout,
    forced: opts.forced ?? false,
  });
}

export async function recordMinesCycle(opts: {
  userId: string;
  betAmount: number;
  outcome: 'WIN' | 'LOSS';
  payout: number;
  forced?: boolean;
}) {
  const config = await getCycleConfig();
  if (!config.enabled) return;
  await recordCycleBet({
    userId: opts.userId,
    game: 'MINES',
    betAmount: opts.betAmount,
    outcome: opts.outcome,
    payout: opts.payout,
    forced: opts.forced ?? false,
  });
}
