import { prisma } from './prisma';
import { getGameConfig, type Config, type GameConfig } from './settings';

export type GameStat = {
  name: string;
  wagered: number;
  won: number;
  ggr: number; // house profit = wagered - won
  rtp: number; // return to player = won / wagered
  realizedEdge: number; // 1 - rtp
  configuredEdge: number;
  bets: number;
  wins: number;
  losses: number;
  biggestPayout: number;
  avgBet: number;
};

export type Stats = {
  crash: GameStat;
  mines: GameStat;
  total: {
    wagered: number;
    won: number;
    ggr: number;
    rtp: number;
    realizedEdge: number;
    bets: number;
    wins: number;
    losses: number;
  };
  deposits: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    approvedAmount: number;
    withdrawalPending: number;
    withdrawalApproved: number;
    withdrawalApprovedAmount: number;
  };
  config: Config;
};

async function crashStat(cfg: GameConfig): Promise<GameStat> {
  const all = await prisma.crashRound.aggregate({ _sum: { betAmount: true }, _count: true });
  const wins = await prisma.crashRound.aggregate({
    where: { status: 'CASHED_OUT' },
    _sum: { payout: true },
    _count: true,
  });
  const biggest = await prisma.crashRound.aggregate({ _max: { payout: true } });
  const bets = all._count;
  const winsCount = wins._count;
  const losses = bets - winsCount;
  const wagered = all._sum.betAmount ?? 0;
  const won = wins._sum.payout ?? 0;
  const ggr = wagered - won;
  const rtp = wagered > 0 ? won / wagered : 0;
  return {
    name: 'Crash',
    wagered, won, ggr,
    rtp, realizedEdge: 1 - rtp,
    configuredEdge: cfg.houseEdge,
    bets, wins: winsCount, losses,
    biggestPayout: biggest._max.payout ?? 0,
    avgBet: bets > 0 ? wagered / bets : 0,
  };
}

async function minesStat(cfg: GameConfig): Promise<GameStat> {
  const all = await prisma.minesGame.aggregate({ _sum: { betAmount: true }, _count: true });
  const wins = await prisma.minesGame.aggregate({
    where: { status: 'CASHED_OUT' },
    _sum: { payout: true },
    _count: true,
  });
  const biggest = await prisma.minesGame.aggregate({ _max: { payout: true } });
  const bets = all._count;
  const winsCount = wins._count;
  const losses = bets - winsCount;
  const wagered = all._sum.betAmount ?? 0;
  const won = wins._sum.payout ?? 0;
  const ggr = wagered - won;
  const rtp = wagered > 0 ? won / wagered : 0;
  return {
    name: 'Mines',
    wagered, won, ggr,
    rtp, realizedEdge: 1 - rtp,
    configuredEdge: cfg.houseEdge,
    bets, wins: winsCount, losses,
    biggestPayout: biggest._max.payout ?? 0,
    avgBet: bets > 0 ? wagered / bets : 0,
  };
}

async function depositsStat() {
  const [total, pending, approved, rejected, approvedAgg, withdrawalPending, withdrawalApproved, withdrawalAgg] = await Promise.all([
    prisma.deposit.count(),
    prisma.deposit.count({ where: { status: 'PENDING' } }),
    prisma.deposit.count({ where: { status: 'APPROVED' } }),
    prisma.deposit.count({ where: { status: 'REJECTED' } }),
    prisma.deposit.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } }),
    prisma.withdrawal.count({ where: { status: 'PENDING' } }),
    prisma.withdrawal.count({ where: { status: 'APPROVED' } }),
    prisma.withdrawal.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } }),
  ]);
  return {
    total, pending, approved, rejected,
    approvedAmount: approvedAgg._sum.amount ?? 0,
    withdrawalPending, withdrawalApproved,
    withdrawalApprovedAmount: withdrawalAgg._sum.amount ?? 0,
  };
}

export async function computeStats(): Promise<Stats> {
  const config = await getGameConfig();
  const [crash, mines, deposits] = await Promise.all([
    crashStat(config.crash),
    minesStat(config.mines),
    depositsStat(),
  ]);
  const wagered = crash.wagered + mines.wagered;
  const won = crash.won + mines.won;
  const ggr = wagered - won;
  const rtp = wagered > 0 ? won / wagered : 0;
  return {
    crash, mines,
    total: {
      wagered, won, ggr,
      rtp, realizedEdge: 1 - rtp,
      bets: crash.bets + mines.bets,
      wins: crash.wins + mines.wins,
      losses: crash.losses + mines.losses,
    },
    deposits,
    config,
  };
}

export const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
export const eur = (n: number) => `€${n.toFixed(2)}`;
