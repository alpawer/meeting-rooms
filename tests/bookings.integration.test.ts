import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { cancelBooking, createBooking, listMyBookings, listRoomBookings } from '@/lib/bookings';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./test.db' }),
});

let roomId = '';
let olena = '';
let bohdan = '';

/** A slot in the future, in office time, so the past rule never interferes. */
function slot(dayOffset: number, hour: number, minute = 0): string {
  return DateTime.now()
    .setZone('Europe/Kyiv')
    .startOf('day')
    .plus({ days: dayOffset })
    .set({ hour, minute })
    .toUTC()
    .toISO()!;
}

beforeEach(async () => {
  await prisma.booking.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.user.deleteMany({});

  roomId = (await prisma.room.create({ data: { name: 'Test room', floor: 1, capacity: 4 } })).id;
  olena = (await prisma.user.create({
    data: { name: 'Olena', email: 'olena@test.local', passwordHash: 'x' },
  })).id;
  bohdan = (await prisma.user.create({
    data: { name: 'Bohdan', email: 'bohdan@test.local', passwordHash: 'x' },
  })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createBooking', () => {
  it('creates a booking and returns the author name', async () => {
    const result = await createBooking(olena, {
      roomId,
      title: 'Sprint planning',
      startsAt: slot(7, 10),
      endsAt: slot(7, 11),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.booking.userName).toBe('Olena');
      expect(result.booking.isMine).toBe(true);
    }
  });

  it('trims the title', async () => {
    const result = await createBooking(olena, {
      roomId,
      title: '   Spaced   ',
      startsAt: slot(7, 10),
      endsAt: slot(7, 11),
    });
    expect(result.ok && result.booking.title).toBe('Spaced');
  });

  it('rejects an overlapping booking', async () => {
    await createBooking(olena, { roomId, title: 'First', startsAt: slot(7, 10), endsAt: slot(7, 12) });
    const result = await createBooking(bohdan, {
      roomId,
      title: 'Second',
      startsAt: slot(7, 11),
      endsAt: slot(7, 13),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe('SLOT_TAKEN');
  });

  it('allows a back to back booking', async () => {
    await createBooking(olena, { roomId, title: 'First', startsAt: slot(7, 10), endsAt: slot(7, 11) });
    const result = await createBooking(bohdan, {
      roomId,
      title: 'Second',
      startsAt: slot(7, 11),
      endsAt: slot(7, 12),
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a booking outside working hours', async () => {
    const result = await createBooking(olena, {
      roomId,
      title: 'Too late',
      startsAt: slot(7, 19),
      endsAt: slot(7, 20),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe('OUTSIDE_WORKING_HOURS');
  });

  it('rejects a booking in the past', async () => {
    const result = await createBooking(olena, {
      roomId,
      title: 'Yesterday',
      startsAt: slot(-1, 10),
      endsAt: slot(-1, 11),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe('IN_THE_PAST');
  });

  it('keeps exactly one booking under concurrent requests for the same slot', async () => {
    const input = { roomId, title: 'Race', startsAt: slot(7, 14), endsAt: slot(7, 15) };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createBooking(olena, input)),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await prisma.booking.count()).toBe(1);
  });
});

describe('cancelBooking', () => {
  it('lets the author cancel their own booking', async () => {
    const created = await createBooking(olena, {
      roomId,
      title: 'Mine',
      startsAt: slot(7, 10),
      endsAt: slot(7, 11),
    });
    if (!created.ok) throw new Error('setup failed');

    expect(await cancelBooking(created.booking.id, olena)).toBe('cancelled');
    expect(await prisma.booking.count()).toBe(0);
  });

  it('refuses to cancel someone else booking', async () => {
    const created = await createBooking(olena, {
      roomId,
      title: 'Mine',
      startsAt: slot(7, 10),
      endsAt: slot(7, 11),
    });
    if (!created.ok) throw new Error('setup failed');

    expect(await cancelBooking(created.booking.id, bohdan)).toBe('forbidden');
    expect(await prisma.booking.count()).toBe(1);
  });

  it('returns not found for an unknown id', async () => {
    expect(await cancelBooking('no-such-id', olena)).toBe('not_found');
  });

  it('frees the slot after cancelling', async () => {
    const created = await createBooking(olena, {
      roomId,
      title: 'Mine',
      startsAt: slot(7, 10),
      endsAt: slot(7, 11),
    });
    if (!created.ok) throw new Error('setup failed');
    await cancelBooking(created.booking.id, olena);

    const again = await createBooking(bohdan, {
      roomId,
      title: 'Someone else',
      startsAt: slot(7, 10),
      endsAt: slot(7, 11),
    });
    expect(again.ok).toBe(true);
  });
});

describe('listings', () => {
  it('shows other people bookings but marks them as not mine', async () => {
    await createBooking(bohdan, { roomId, title: 'Theirs', startsAt: slot(7, 10), endsAt: slot(7, 11) });

    const list = await listRoomBookings(
      roomId,
      new Date(slot(7, 9)),
      new Date(slot(7, 19)),
      olena,
    );
    expect(list).toHaveLength(1);
    expect(list[0].isMine).toBe(false);
    expect(list[0].userName).toBe('Bohdan');
  });

  it('returns only own upcoming bookings', async () => {
    await createBooking(olena, { roomId, title: 'Mine', startsAt: slot(7, 10), endsAt: slot(7, 11) });
    await createBooking(bohdan, { roomId, title: 'Theirs', startsAt: slot(7, 12), endsAt: slot(7, 13) });

    const page = await listMyBookings(olena, 'upcoming', 0, 10);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].title).toBe('Mine');
  });
});
