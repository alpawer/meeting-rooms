import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { apiError, localeFrom, notFound, readJson, unauthorized, validationError } from '@/lib/http';
import { buildSchemas } from '@/lib/schemas';
import { messages } from '@/lib/messages';
import { createBooking, listRoomBookings } from '@/lib/bookings';

/** GET /api/bookings?roomId=...&from=ISO&to=ISO */
export async function GET(request: Request) {
  const locale = localeFrom(request);
  const user = await getSessionUser();
  if (!user) return unauthorized(locale);

  const params = new URL(request.url).searchParams;
  const roomId = params.get('roomId');
  const from = new Date(params.get('from') ?? '');
  const to = new Date(params.get('to') ?? '');

  if (!roomId || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return apiError(400, 'BAD_REQUEST', 'roomId, from and to are required.');
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound(locale);

  return NextResponse.json({ room, bookings: await listRoomBookings(roomId, from, to, user.id) });
}

/** POST /api/bookings */
export async function POST(request: Request) {
  const locale = localeFrom(request);
  const user = await getSessionUser();
  if (!user) return unauthorized(locale);

  // The spec blocks booking until the address is confirmed, signing in and
  // browsing stay open so the user can see why.
  if (!user.emailVerified) {
    return apiError(403, 'EMAIL_NOT_VERIFIED', messages(locale).api.emailNotVerified);
  }

  const parsed = buildSchemas(locale).createBooking.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error, locale);

  const room = await prisma.room.findUnique({ where: { id: parsed.data.roomId } });
  if (!room) return notFound(locale);

  const result = await createBooking(user.id, parsed.data, locale);
  if (!result.ok) {
    // A taken slot is a conflict with other data, everything else is an
    // invalid request, so the two get different status codes.
    const status = result.failure.code === 'SLOT_TAKEN' ? 409 : 422;
    return apiError(status, result.failure.code, result.failure.message);
  }

  return NextResponse.json({ booking: result.booking }, { status: 201 });
}
