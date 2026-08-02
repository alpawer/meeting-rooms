import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { localeFrom, unauthorized } from '@/lib/http';
import { listMyBookings } from '@/lib/bookings';

const PAGE_SIZE = 10;

/** GET /api/bookings/mine?scope=upcoming|past&page=0 */
export async function GET(request: Request) {
  const locale = localeFrom(request);
  const user = await getSessionUser();
  if (!user) return unauthorized(locale);

  const params = new URL(request.url).searchParams;
  const scope = params.get('scope') === 'past' ? 'past' : 'upcoming';
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0);

  return NextResponse.json(await listMyBookings(user.id, scope, page, PAGE_SIZE));
}
