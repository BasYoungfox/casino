import { NextResponse } from 'next/server';
import { getGameConfig } from '@/lib/settings';

export async function GET() {
  return NextResponse.json(await getGameConfig());
}
