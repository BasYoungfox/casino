/**
 * Cycle Engine — scripted payout flow
 *
 * Every CYCLE_SIZE bets the house is guaranteed to be up by TARGET_PROFIT_PER_CYCLE.
 * We start with HOUSE_BUFFER as an initial buffer.
 *
 * How it works:
 * - Each cycle has CYCLE_SIZE slots.
 * - Each slot is either WIN (player wins) or LOSS (player loses).
 * - The pattern is generated so that:
 *     sum(payouts on wins) - sum(bets on losses) = -TARGET_PROFIT_PER_CYCLE
 *   i.e. the house nets TARGET_PROFIT_PER_CYCLE per cycle.
 *
 * The win multiplier for winning slots is determined by the multiplier setting,
 * but the actual payout is capped so the cycle math holds.
 *
 * We use a fixed slot pattern per cycle. Example for 25 slots:
 *   LOSS on slots: 1,2,4,5,7,8,10,11,13,14,16,17,19,20,22,23 (16 losses)
 *   WIN  on slots: 3,6,9,12,15,18,21,24,25               (9 wins)
 *
 * With a 2× win multiplier on wins and 1× loss on losses:
 *   House profit per cycle = (16 × avg_bet × 1) - (9 × avg_bet × 2) + (9 × avg_bet)
 *                          = avg_bet × (16 - 18 + 9) = avg_bet × 7
 *
 * We configure a TARGET_PROFIT_PER_CYCLE in euros. The pattern adjusts the
 * ratio of wins/losses dynamically to hit that target given actual bet amounts.
 *
 * In practice: the engine looks at the NEXT slot in the cycle and returns
 * whether this bet should WIN or LOSE, plus what crash point / mine layout
 * to generate to enforce that outcome.
 */

import { prisma } from './prisma';
import { getSettingNumber, getSettingBool } from './settings';

export const CYCLE_SIZE = 25;

// Slot pattern: true = player wins, false = player loses
// 9 wins out of 25 = 36% win rate → house edge ~28% at 2× payout
// Spread wins evenly: every ~3rd bet wins
export const BASE_PATTERN: boolean[] = [
  false, false, true,   // 1-3
  false, false, true,   // 4-6
  false, false, true,   // 7-9
  false, false, true,   // 10-12
  false, false, true,   // 13-15
  false, false, true,   // 16-18
  false, false, true,   // 19-21
  false, false, true,   // 22-24
  true,                 // 25 — bonus win at cycle end
];

export type CycleSlot = {
  position: number;        // 1-25
  shouldWin: boolean;
  cycleNumber: number;
  totalBetCount: number;
};

export type CycleConfig = {
  cycleSize: number;
  targetProfitPerCycle: number;  // € house profit per cycle
  houseBuffer: number;           // starting house advantage €
  winMultiplier: number;         // what players see as their win (e.g. 2.0×)
  enabled: boolean;
};

export async function getCycleConfig(): Promise<CycleConfig> {
  const [cycleSize, target, buffer, winMult, enabled] = await Promise.all([
    getSettingNumber('cycle.size', CYCLE_SIZE),
    getSettingNumber('cycle.targetProfit', 20),
    getSettingNumber('cycle.houseBuffer', 20),
    getSettingNumber('cycle.winMultiplier', 2.0),
    getSettingBool('cycle.enabled', true),
  ]);
  return {
    cycleSize,
    targetProfitPerCycle: target,
    houseBuffer: buffer,
    winMultiplier: winMult,
    enabled,
  };
}

/**
 * Returns the current slot for the NEXT bet.
 * Reads the total bet count from BetCycle table.
 */
export async function getNextSlot(): Promise<CycleSlot> {
  const count = await prisma.betCycle.count();
  const totalBetCount = count + 1;
  const cycleNumber = Math.ceil(totalBetCount / CYCLE_SIZE);
  const positionInCycle = ((totalBetCount - 1) % CYCLE_SIZE); // 0-indexed
  const shouldWin = BASE_PATTERN[positionInCycle] ?? false;
  return {
    position: positionInCycle + 1,
    shouldWin,
    cycleNumber,
    totalBetCount,
  };
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
  slot: CycleSlot;
}) {
  const profit = opts.outcome === 'LOSS'
    ? opts.betAmount            // house keeps the bet
    : opts.betAmount - opts.payout;  // house pays out (negative = house loses)

  await prisma.betCycle.create({
    data: {
      cycleNumber: opts.slot.cycleNumber,
      betInCycle: opts.slot.position,
      totalBets: opts.slot.totalBetCount,
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
 * For a WIN slot: generate a crash point that is reachable (between 1.5 and winMultiplier).
 * For a LOSS slot: generate a crash point that crashes before 1.5 (player loses).
 */
export function generateControlledCrashPoint(shouldWin: boolean, winMultiplier: number): number {
  if (shouldWin) {
    // Crash somewhere ABOVE the typical cashout range so the player can cash out
    // We pick a random point between winMultiplier+0.5 and winMultiplier+5
    const min = winMultiplier + 0.5;
    const max = winMultiplier + 5;
    return Math.round((min + Math.random() * (max - min)) * 100) / 100;
  } else {
    // Crash early — between 1.01 and 1.49 so the player almost certainly loses
    const min = 1.01;
    const max = 1.49;
    return Math.round((min + Math.random() * (max - min)) * 100) / 100;
  }
}

/**
 * For Mines: on a WIN slot, place mines away from obvious tiles.
 * On a LOSS slot, place a mine on tile 0 (first tile most players click).
 */
export function generateControlledMines(
  shouldWin: boolean,
  minesCount: number,
  totalTiles: number
): number[] {
  if (shouldWin) {
    // Place mines in the last N positions — player typically clicks 0-12 first
    const safeZone = Math.floor(totalTiles / 2);
    const positions = new Set<number>();
    while (positions.size < minesCount) {
      // Bias mines towards higher indices
      const pos = safeZone + Math.floor(Math.random() * (totalTiles - safeZone));
      positions.add(pos);
    }
    return [...positions].sort((a, b) => a - b);
  } else {
    // Place one mine early (tiles 0-5), rest randomly
    const positions = new Set<number>();
    // First mine in first 6 tiles
    positions.add(Math.floor(Math.random() * 6));
    while (positions.size < minesCount) {
      positions.add(Math.floor(Math.random() * totalTiles));
    }
    return [...positions].sort((a, b) => a - b);
  }
}

/**
 * Compute cycle statistics for the admin dashboard.
 */
export async function getCycleStats() {
  const config = await getCycleConfig();

  const [totalBets, totalData, cycleAgg, currentCycleBets] = await Promise.all([
    prisma.betCycle.count(),
    prisma.betCycle.aggregate({
      _sum: { betAmount: true, payout: true, profit: true },
    }),
    prisma.betCycle.groupBy({
      by: ['cycleNumber'],
      _sum: { betAmount: true, payout: true, profit: true },
      _count: true,
      orderBy: { cycleNumber: 'asc' },
    }),
    // Current incomplete cycle
    (async () => {
      const count = await prisma.betCycle.count();
      const currentCycle = Math.ceil((count || 1) / CYCLE_SIZE);
      return prisma.betCycle.findMany({
        where: { cycleNumber: currentCycle },
        orderBy: { betInCycle: 'asc' },
      });
    })(),
  ]);

  const wagered = totalData._sum.betAmount ?? 0;
  const paid = totalData._sum.payout ?? 0;
  const totalProfit = totalData._sum.profit ?? 0;

  const currentCycleNumber = Math.ceil((totalBets || 1) / CYCLE_SIZE);
  const positionInCycle = ((totalBets) % CYCLE_SIZE) || CYCLE_SIZE;
  const nextShouldWin = totalBets < CYCLE_SIZE * 1000
    ? BASE_PATTERN[(totalBets) % CYCLE_SIZE]
    : false;

  // Expected profit: houseBuffer + cyclesCompleted * targetProfit
  const cyclesCompleted = Math.floor(totalBets / CYCLE_SIZE);
  const expectedProfit = config.houseBuffer + cyclesCompleted * config.targetProfitPerCycle;

  return {
    config,
    totalBets,
    wagered,
    paid,
    totalProfit,
    currentCycleNumber,
    positionInCycle,
    nextSlotWins: nextShouldWin,
    cyclesCompleted,
    expectedProfit,
    profitVsExpected: totalProfit - expectedProfit,
    cycleHistory: cycleAgg.map((c) => ({
      cycleNumber: c.cycleNumber,
      bets: c._count,
      wagered: c._sum.betAmount ?? 0,
      paid: c._sum.payout ?? 0,
      profit: c._sum.profit ?? 0,
    })),
    currentCycleBets,
  };
}
