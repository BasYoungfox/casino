import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getGameConfig, setGameConfig, type GameConfig } from '@/lib/settings';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }
  return NextResponse.json(await getGameConfig());
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const game = body.game as 'crash' | 'mines' | undefined;
  const c = body.config as Partial<GameConfig> | undefined;
  if (!game || !c) {
    return NextResponse.json({ error: 'Ongeldig verzoek.' }, { status: 400 });
  }

  const update: Partial<GameConfig> = {};
  if (c.houseEdge !== undefined) {
    let he = Number(c.houseEdge);
    if (isNaN(he) || he < 0) he = 0;
    if (he > 0.5) he = 0.5; // max 50% house edge
    update.houseEdge = he;
  }
  if (c.minBet !== undefined) {
    let min = Number(c.minBet);
    if (isNaN(min) || min < 0) min = 0;
    update.minBet = min;
  }
  if (c.maxBet !== undefined) {
    let max = Number(c.maxBet);
    if (isNaN(max) || max < 0) max = 0;
    update.maxBet = max;
  }
  if (c.enabled !== undefined) {
    update.enabled = !!c.enabled;
  }
  if (update.minBet !== undefined && update.maxBet !== undefined && update.minBet > update.maxBet) {
    return NextResponse.json({ error: 'Min inzet mag niet boven max inzet liggen.' }, { status: 400 });
  }

  await setGameConfig(game, update);
  return NextResponse.json(await getGameConfig());
}
