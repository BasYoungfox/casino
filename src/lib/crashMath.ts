// Pure crash-game math. Importable by both server and client (no server deps).

// Growth rate per millisecond. multiplier(t) = e^(K * t).
// Tuned so the curve feels tense: ~1.8x at 5s, ~3.3x at 10s.
export const CRASH_K = 0.00012;

/** Multiplier at a given elapsed time (ms). Never below 1.00x. */
export function multiplierAt(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1;
  return Math.exp(CRASH_K * elapsedMs);
}

/** Milliseconds needed for the multiplier to reach a target value. */
export function timeToReach(multiplier: number): number {
  if (multiplier <= 1) return 0;
  return Math.log(multiplier) / CRASH_K;
}

/**
 * Provably-ish crash point with a house edge.
 * ~`houseEdge` fraction of rounds crash instantly at 1.00x.
 * Distribution: P(crash <= x) = 1 - (1 - edge)/x  => median ~2x, long tail.
 */
export function generateCrashPoint(houseEdge = 0.01): number {
  const r = Math.random();
  let point = (1 - houseEdge) / (1 - r);
  // round to 2 decimals, clamp at 1.00
  point = Math.max(1, Math.floor(point * 100) / 100);
  return point;
}

export function formatMultiplier(m: number): string {
  return `${m.toFixed(2)}×`;
}
