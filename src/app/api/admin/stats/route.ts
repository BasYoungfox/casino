import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { computeStats } from '@/lib/stats';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 });
  }
  return NextResponse.json(await computeStats());
}
