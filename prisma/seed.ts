import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const OFFICE_TIMEZONE = process.env.OFFICE_TIMEZONE ?? 'Europe/Kyiv';
const PASSWORD = process.env.SEED_USER_PASSWORD ?? 'password123';

const ROOMS = [
  { name: 'Red Bull', floor: 2, capacity: 10 },
  { name: 'Ferrari', floor: 2, capacity: 6 },
  { name: 'Mercedes', floor: 3, capacity: 12 },
  { name: 'McLaren', floor: 3, capacity: 4 },
  { name: 'Aston Martin', floor: 4, capacity: 20 },
  { name: 'Williams', floor: 1, capacity: 2 },
];

const USERS = [
  { name: 'Олена Ткач', email: 'olena@ua-skills.com' },
  { name: 'Богдан Кравець', email: 'bohdan@ua-skills.com' },
];

/**
 * Demo bookings are anchored to the next working days rather than to the
 * current week. Anchored to the week, a seed run on a weekend would leave
 * the whole grid in the past.
 */
function demoAnchor(): DateTime {
  let day = DateTime.now().setZone(OFFICE_TIMEZONE).startOf('day');
  if (DateTime.now().setZone(OFFICE_TIMEZONE) >= day.set({ hour: 18 })) {
    day = day.plus({ days: 1 });
  }
  while (day.weekday > 5) day = day.plus({ days: 1 });
  return day;
}

const ANCHOR = demoAnchor();

function officeSlot(dayOffset: number, hour: number, minute = 0): Date {
  let day = ANCHOR;
  for (let i = 0; i < dayOffset; i += 1) {
    day = day.plus({ days: 1 });
    while (day.weekday > 5) day = day.plus({ days: 1 });
  }
  return day.set({ hour, minute }).toJSDate();
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const users = await Promise.all(
    USERS.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name, passwordHash },
        create: { ...user, passwordHash },
      }),
    ),
  );

  const rooms = await Promise.all(
    ROOMS.map((room) =>
      prisma.room.upsert({ where: { name: room.name }, update: room, create: room }),
    ),
  );

  const byName = (name: string) => rooms.find((room) => room.name === name)!;

  // Removing previous demo bookings keeps the seed idempotent, otherwise
  // repeated runs would pile up rows on new dates. Other users are untouched.
  await prisma.booking.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });

  // The two back to back bookings on the first day are deliberate: they show
  // straight away that adjacent slots do not conflict.
  const demo = [
    { room: 'Red Bull', user: 0, title: 'Планування спринту', day: 0, from: 10, to: 11 },
    { room: 'Red Bull', user: 1, title: 'Демо для замовника', day: 0, from: 11, to: 12 },
    { room: 'Red Bull', user: 1, title: 'Ретроспектива', day: 2, from: 15, to: 16.5 },
    { room: 'Ferrari', user: 0, title: 'Співбесіда, junior QA', day: 1, from: 12, to: 13 },
    { room: 'Ferrari', user: 1, title: 'Синк з дизайном', day: 3, from: 9.5, to: 10.5 },
    { room: 'McLaren', user: 0, title: 'One-on-one', day: 2, from: 9, to: 9.5 },
    { room: 'Aston Martin', user: 1, title: 'Загальні збори', day: 4, from: 16, to: 18 },
  ];

  for (const item of demo) {
    await prisma.booking.create({
      data: {
        title: item.title,
        startsAt: officeSlot(item.day, Math.floor(item.from), (item.from % 1) * 60),
        endsAt: officeSlot(item.day, Math.floor(item.to), (item.to % 1) * 60),
        roomId: byName(item.room).id,
        userId: users[item.user].id,
      },
    });
  }

  console.log(`Seeded ${rooms.length} rooms, ${users.length} users, ${demo.length} bookings.`);
  console.log(`Test accounts: ${USERS.map((u) => u.email).join(', ')} / password ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
