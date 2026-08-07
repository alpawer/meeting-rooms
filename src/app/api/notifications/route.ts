import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { localeFrom, readJson, unauthorized } from '@/lib/http';
import { findEndingSoon, markNotified } from '@/lib/bookings';
import { NOTIFY_BEFORE_MINUTES } from '@/lib/office';

/** GET /api/notifications, bookings of this user that are ending soon. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(localeFrom(request));

  return NextResponse.json({ notices: await findEndingSoon(user.id, NOTIFY_BEFORE_MINUTES) });
}

/** POST /api/notifications, marks notices as seen. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(localeFrom(request));

  const body = (await readJson(request)) as { bookingIds?: unknown };
  const ids = Array.isArray(body.bookingIds)
    ? body.bookingIds.filter((id): id is string => typeof id === 'string')
    : [];

  await markNotified(ids, user.id);
  return NextResponse.json({ ok: true });
}
