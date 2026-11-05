import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (username.length < 3) {
    return NextResponse.json({ error: 'Gebruikersnaam moet minstens 3 tekens zijn.' }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Ongeldig e-mailadres.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Wachtwoord moet minstens 6 tekens zijn.' }, { status: 400 });
  }

  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (exists) {
    return NextResponse.json({ error: 'Gebruikersnaam of e-mail is al in gebruik.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, passwordHash, role: 'USER', balance: 0 },
  });

  const token = await signToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    balance: user.balance,
  });
  await setAuthCookie(token);

  return NextResponse.json({ ok: true });
}
