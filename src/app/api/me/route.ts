import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }
  return NextResponse.json({
    balance: user.balance,
    username: user.username,
    role: user.role,
  });
}
