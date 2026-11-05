import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!username || !password) {
    return NextResponse.json({ error: 'Vul gebruikersnaam en wachtwoord in.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: 'Onbekende gebruiker of onjuist wachtwoord.' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Onbekende gebruiker of onjuist wachtwoord.' }, { status: 401 });
  }

  const token = await signToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    balance: user.balance,
  });
  await setAuthCookie(token);

  return NextResponse.json({ ok: true, role: user.role });
}
