import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { User } from '@prisma/client';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-me'
);

export const TOKEN_COOKIE = 'casino_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 dagen

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  balance: number;
};

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    balance: user.balance,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      username: payload.username as string,
      email: payload.email as string,
      role: payload.role as string,
      balance: payload.balance as number,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Haalt de gebruiker vers uit de DB (saldo kan veranderd zijn). */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.id } });
}

export function requireAdmin(session: SessionUser | null): session is SessionUser {
  return !!session && session.role === 'ADMIN';
}

export async function setAuthCookie(token: string) {
  cookies().set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  });
}

export function clearAuthCookie() {
  cookies().set(TOKEN_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
}
