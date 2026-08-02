import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { localeFrom, unauthorized } from '@/lib/http';

export async function GET(request: Request) {
  if (!(await getSessionUser())) return unauthorized(localeFrom(request));

  const minCapacity = Number(new URL(request.url).searchParams.get('minCapacity') ?? 0);

  const rooms = await prisma.room.findMany({
    where: Number.isFinite(minCapacity) && minCapacity > 0 ? { capacity: { gte: minCapacity } } : {},
    orderBy: [{ floor: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ rooms });
}
