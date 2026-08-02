import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { CLOSE_HOUR, OFFICE_TIMEZONE, OPEN_HOUR, SLOT_MINUTES } from '@/lib/office';
import { WeekGrid } from '@/components/WeekGrid';

export const dynamic = 'force-dynamic';

export default async function RoomSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) redirect('/login');

  const { id } = await params;
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) notFound();

  return (
    <WeekGrid
      room={room}
      office={{
        timeZone: OFFICE_TIMEZONE,
        openHour: OPEN_HOUR,
        closeHour: CLOSE_HOUR,
        slotMinutes: SLOT_MINUTES,
      }}
    />
  );
}
