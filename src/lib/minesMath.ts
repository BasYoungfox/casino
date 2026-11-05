// Pure Mines math. Importable by both server and client (no server deps).

export const TOTAL_TILES = 25;

/** Fair multiplier after `picks` safe reveals on `total` tiles with `mines` mines. */
export function minesMultiplier(
  picks: number,
  mines: number,
  total: number = TOTAL_TILES,
  houseEdge = 0.01
): number {
  if (picks <= 0) return 1;
  let mult = 1;
  for (let i = 0; i < picks; i++) {
    // bij elke safe pick: (overgebleven tegels) / (overgebleven safe tegels)
    mult *= (total - i) / (total - mines - i);
  }
  return mult * (1 - houseEdge);
}

/** Willekeurige, unieke mijn-posities. */
export function generateMines(mines: number, total: number = TOTAL_TILES): number[] {
  const positions = new Set<number>();
  while (positions.size < mines) {
    positions.add(Math.floor(Math.random() * total));
  }
  return [...positions].sort((a, b) => a - b);
}

export function formatMultiplier(m: number): string {
  return `${m.toFixed(2)}×`;
}
