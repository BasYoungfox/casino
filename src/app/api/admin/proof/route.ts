import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const depositId = searchParams.get('id');
  if (!depositId) {
    return NextResponse.json({ error: 'Geen deposit id.' }, { status: 400 });
  }

  const deposit = await prisma.deposit.findUnique({
    where: { id: depositId },
    select: { proofFilePath: true },
  });
  if (!deposit) {
    return NextResponse.json({ error: 'Niet gevonden.' }, { status: 404 });
  }

  // For private blobs, the stored URL is already a signed URL from Vercel Blob
  // We just redirect to it directly
  return NextResponse.redirect(deposit.proofFilePath);
}
