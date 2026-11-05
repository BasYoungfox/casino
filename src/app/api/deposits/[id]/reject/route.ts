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

  await prisma.deposit.update({
    where: { id: deposit.id },
    data: {
      status: 'REJECTED',
      reviewedAt: new Date(),
      reviewedById: user.id,
      reviewNote: note,
    },
  });

  return NextResponse.json({ ok: true });
}
