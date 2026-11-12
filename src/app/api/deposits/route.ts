import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const form = await req.formData();
  const amount = parseFloat(String(form.get('amount')));
  const note = String(form.get('note') || '').slice(0, 500) || null;
  const file = form.get('proof') as File | null;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Ongeldig bedrag.' }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Geen bewijs geüpload.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Bestand te groot (max 8 MB).' }, { status: 413 });
  }
  if (ALLOWED_TYPES.length && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Bestandstype niet toegestaan.' }, { status: 415 });
  }

  // Upload to Vercel Blob (private — betalingsbewijzen zijn niet publiek)
  const blob = await put(`deposits/${user.id}/${Date.now()}-${file.name}`, file, {
    access: 'private',
  });

  const deposit = await prisma.deposit.create({
    data: {
      userId: user.id,
      amount,
      status: 'PENDING',
      proofFilePath: blob.url, // store full URL instead of local path
      note,
    },
  });

  return NextResponse.json({ ok: true, id: deposit.id });
}
