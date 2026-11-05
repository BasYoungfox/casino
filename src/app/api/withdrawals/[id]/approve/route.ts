import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reviewNote = String(body.note || '').slice(0, 500) || null;

  const w = await prisma.withdrawal.findUnique({ where: { id: params.id } });
  if (!w) return NextResponse.json({ error: 'Opname niet gevonden.' }, { status: 404 });
  if (w.status !== 'PENDING')
    return NextResponse.json({ error: 'Opname is al beoordeeld.' }, { status: 400 });

  // Saldo blijft afgeschreven (al gedaan bij aanmaken) — alleen status updaten
  await prisma.withdrawal.update({
    where: { id: w.id },
    data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: user.id, reviewNote },
  });

  await prisma.transaction.create({
    data: {
      userId: w.userId,
      type: 'WITHDRAWAL_APPROVED',
      amount: 0, // saldo al afgeschreven bij PENDING
      balanceAfter: await currentBalance(w.userId),
    },
  });

  return NextResponse.json({ ok: true });
}

async function currentBalance(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  return u?.balance ?? 0;
}
