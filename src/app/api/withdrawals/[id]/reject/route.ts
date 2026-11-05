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

  // Saldo terugstorten
  const newBalance = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: w.userId } });
    if (!fresh) throw new Error('Gebruiker niet gevonden.');
    const balance = fresh.balance + w.amount;
    await tx.user.update({ where: { id: w.userId }, data: { balance } });
    await tx.withdrawal.update({
      where: { id: w.id },
      data: { status: 'REJECTED', reviewedAt: new Date(), reviewedById: user.id, reviewNote },
    });
    await tx.transaction.create({
      data: {
        userId: w.userId,
        type: 'WITHDRAWAL_REJECTED',
        amount: w.amount, // saldo terug
        balanceAfter: balance,
      },
    });
    return balance;
  });

  return NextResponse.json({ ok: true, newBalance });
}
