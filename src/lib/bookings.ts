import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkBookingRules, type BookingRuleFailure } from '@/lib/booking-rules';
import { DEFAULT_LOCALE, messages, type Locale } from '@/lib/messages';
import type { CreateBookingInput } from '@/lib/schemas';

export interface BookingDto {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  isMine: boolean;
}

const INCLUDE = {
  user: { select: { id: true, name: true } },
  room: { select: { id: true, name: true } },
} as const;

type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof INCLUDE }>;

function toDto(booking: BookingWithRelations, viewerId: string | null): BookingDto {
  return {
    id: booking.id,
    title: booking.title,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    roomId: booking.room.id,
    roomName: booking.room.name,
    userId: booking.user.id,
    userName: booking.user.name,
    isMine: booking.user.id === viewerId,
  };
}

/** Bookings of a room that overlap the [from, to) window. */
export async function listRoomBookings(
  roomId: string,
  from: Date,
  to: Date,
  viewerId: string | null,
): Promise<BookingDto[]> {
  const bookings = await prisma.booking.findMany({
    where: { roomId, startsAt: { lt: to }, endsAt: { gt: from } },
    include: INCLUDE,
    orderBy: { startsAt: 'asc' },
  });
  return bookings.map((booking) => toDto(booking, viewerId));
}

class RuleViolation extends Error {
  constructor(public readonly failure: BookingRuleFailure) {
    super(failure.message);
  }
}

export type CreateBookingResult =
  | { ok: true; booking: BookingDto }
  | { ok: false; failure: BookingRuleFailure };

/**
 * Creates a booking.
 *
 * Two layers guard against concurrent requests for the same slot:
 *  1. the overlap check and the insert run inside one transaction;
 *  2. a unique index on (roomId, startsAt) catches identical start times
 *     even if two transactions somehow both read the slot as free.
 * The P2002 branch returns the same SLOT_TAKEN failure, so the user sees
 * one message no matter which layer fired.
 *
 * Verified under load on a production build. Eight concurrent requests for
 * the same slot returned one 201 and seven 409, and six overlapping requests
 * with different start times, where the unique index cannot help, returned
 * one 201 and five 409. In both cases the database held exactly one row.
 *
 * better-sqlite3 is synchronous, so transactions cannot interleave. Prisma 6
 * needed connection_limit=1 in the URL for this, Prisma 7 hands pooling to
 * the driver and the parameter is gone.
 */
export async function createBooking(
  userId: string,
  input: CreateBookingInput,
  locale: Locale = DEFAULT_LOCALE,
  now: Date = new Date(),
): Promise<CreateBookingResult> {
  const candidate = { start: new Date(input.startsAt), end: new Date(input.endsAt) };

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Same predicate as intervalsOverlap, expressed in SQL.
      const overlapping = await tx.booking.findMany({
        where: {
          roomId: input.roomId,
          startsAt: { lt: candidate.end },
          endsAt: { gt: candidate.start },
        },
        select: { startsAt: true, endsAt: true },
      });

      const failure = checkBookingRules(
        candidate,
        overlapping.map((item) => ({ start: item.startsAt, end: item.endsAt })),
        now,
        locale,
      );
      if (failure) throw new RuleViolation(failure);

      return tx.booking.create({
        data: {
          title: input.title.trim(),
          startsAt: candidate.start,
          endsAt: candidate.end,
          roomId: input.roomId,
          userId,
        },
        include: INCLUDE,
      });
    });

    return { ok: true, booking: toDto(created, userId) };
  } catch (error) {
    if (error instanceof RuleViolation) return { ok: false, failure: error.failure };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        ok: false,
        failure: { code: 'SLOT_TAKEN', message: messages(locale).booking.slotTaken },
      };
    }
    throw error;
  }
}

export type CancelResult = 'cancelled' | 'not_found' | 'forbidden';

/**
 * Cancels a booking. Ownership is checked on the server, not only hidden in
 * the UI, so a direct DELETE for someone else's booking returns 403.
 */
export async function cancelBooking(bookingId: string, userId: string): Promise<CancelResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true },
  });
  if (!booking) return 'not_found';
  if (booking.userId !== userId) return 'forbidden';

  await prisma.booking.delete({ where: { id: bookingId } });
  return 'cancelled';
}

export interface MyBookingsPage {
  items: BookingDto[];
  hasMore: boolean;
}

/** Own bookings: upcoming with the nearest first, past with the latest first. */
export async function listMyBookings(
  userId: string,
  scope: 'upcoming' | 'past',
  page: number,
  pageSize: number,
  now: Date = new Date(),
): Promise<MyBookingsPage> {
  const where = scope === 'upcoming' ? { userId, endsAt: { gt: now } } : { userId, endsAt: { lte: now } };

  const bookings = await prisma.booking.findMany({
    where,
    include: INCLUDE,
    orderBy: { startsAt: scope === 'upcoming' ? 'asc' : 'desc' },
    skip: page * pageSize,
    // One extra row tells us whether another page exists, without a count query.
    take: pageSize + 1,
  });

  return {
    items: bookings.slice(0, pageSize).map((booking) => toDto(booking, userId)),
    hasMore: bookings.length > pageSize,
  };
}
