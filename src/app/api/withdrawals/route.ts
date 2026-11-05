import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MIN_WITHDRAW = 0.01;
const TIKKIE_RE = /^https:\/\/tikkie\.me\//i;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const tikkieUrl = String(body.tikkieUrl || '').trim();
  const note = String(body.note || '').slice(0, 500) || null;

  if (!amount || amount < MIN_WITHDRAW)
    return NextResponse.json({ error: `Minimum opname is €${MIN_WITHDRAW}.` }, { status: 400 });
  if (!TIKKIE_RE.test(tikkieUrl))
    return NextResponse.json({ error: 'Vul een geldige Tikkie-link in (https://tikkie.me/…).' }, { status: 400 });

  // Saldo blokkeren in één transactie
  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: user.id } });
    if (!fresh) throw new Error('Gebruiker niet gevonden.');
    if (fresh.balance < amount) throw new Error('Onvoldoende saldo.');

    const newBalance = fresh.balance - amount;
    await tx.user.update({ where: { id: user.id }, data: { balance: newBalance } });

    const withdrawal = await tx.withdrawal.create({
      data: { userId: user.id, amount, tikkieUrl, note, status: 'PENDING' },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'WITHDRAWAL_PENDING',
        amount: -amount,
        balanceAfter: newBalance,
      },
    });

    return { withdrawal, newBalance };
  });

  return NextResponse.json({ ok: true, id: result.withdrawal.id });
}
