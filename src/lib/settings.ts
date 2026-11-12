import { prisma } from './prisma';

export type GameConfig = {
  houseEdge: number;
  minBet: number;
  maxBet: number;
  enabled: boolean;
};

export type Config = {
  crash: GameConfig;
  mines: GameConfig;
};

export const DEFAULT_CONFIG: Config = {
  crash: { houseEdge: 0.01, minBet: 0.5, maxBet: 1000, enabled: true },
  mines: { houseEdge: 0.01, minBet: 0.5, maxBet: 1000, enabled: true },
};

const key = (game: 'crash' | 'mines', field: keyof GameConfig) => `game.${game}.${field}`;

export async function getSetting(k: string, fallback: string): Promise<string> {
  try {
    const s = await prisma.setting.findUnique({ where: { key: k } });
    return s ? s.value : fallback;
  } catch {
    // Table may not exist yet — return fallback silently
    return fallback;
  }
}

export async function getSettingNumber(k: string, fallback: number): Promise<number> {
  const v = await getSetting(k, String(fallback));
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

export async function getSettingBool(k: string, fallback: boolean): Promise<boolean> {
  const v = await getSetting(k, fallback ? 'true' : 'false');
  return v === 'true';
}

export async function setSetting(k: string, value: string): Promise<void> {
  try {
    await prisma.setting.upsert({
      where: { key: k },
      create: { key: k, value: String(value) },
      update: { value: String(value) },
    });
  } catch (e) {
    // If Setting table doesn't exist, try to create it first
    try {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "Setting" (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
      );
      await prisma.setting.upsert({
        where: { key: k },
        create: { key: k, value: String(value) },
        update: { value: String(value) },
      });
    } catch (e2) {
      console.error('setSetting failed:', e2);
    }
  }
}

export async function getGameConfig(): Promise<Config> {
  const d = DEFAULT_CONFIG;
  const load = async (game: 'crash' | 'mines'): Promise<GameConfig> => ({
    houseEdge: await getSettingNumber(key(game, 'houseEdge'), d[game].houseEdge),
    minBet: await getSettingNumber(key(game, 'minBet'), d[game].minBet),
    maxBet: await getSettingNumber(key(game, 'maxBet'), d[game].maxBet),
    enabled: await getSettingBool(key(game, 'enabled'), d[game].enabled),
  });
  return { crash: await load('crash'), mines: await load('mines') };
}

export async function setGameConfig(game: 'crash' | 'mines', cfg: Partial<GameConfig>): Promise<void> {
  const entries = Object.entries(cfg) as [keyof GameConfig, number | boolean][];
  for (const [field, val] of entries) {
    await setSetting(key(game, field), String(val));
  }
}
