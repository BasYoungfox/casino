import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const note = String(body.note || '').slice(0, 500) || null;

  const deposit = await prisma.deposit.findUnique({ where: { id: params.id } });
  if (!deposit) {
    return NextResponse.json({ error: 'Storting niet gevonden.' }, { status: 404 });
  }
  if (deposit.status !== 'PENDING') {
    return NextResponse.json({ error: 'Storting is al beoordeeld.' }, { status: 400 });
  }

  // Alles in één transactie: goedkeuren + saldo bijschrijven + transactie loggen.
  const result = await prisma.$transaction(async (tx) => {
    const freshUser = await tx.user.findUnique({ where: { id: deposit.userId } });
    if (!freshUser) throw new Error('Gebruiker niet gevonden.');

    const newBalance = freshUser.balance + deposit.amount;

    const updated = tx.deposit.update({
      where: { id: deposit.id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: user.id,
        reviewNote: note,
      },
    });

    const updateUser = tx.user.update({
      where: { id: deposit.userId },
      data: { balance: newBalance },
    });

    const transaction = tx.transaction.create({
      data: {
        userId: deposit.userId,
        type: 'DEPOSIT',
        amount: deposit.amount,
        balanceAfter: newBalance,
        depositId: deposit.id,
      },
    });

    await Promise.all([updated, updateUser, transaction]);
    return newBalance;
  });

  return NextResponse.json({ ok: true, newBalance: result });
}
