import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { officeZoneLabel } from '@/lib/office';
import { RoomsBrowser } from '@/components/RoomsBrowser';

export const dynamic = 'force-dynamic';

export default async function RoomsPage() {
  if (!(await getSessionUser())) redirect('/login');

  const rooms = await prisma.room.findMany({ orderBy: [{ floor: 'asc' }, { name: 'asc' }] });

  return <RoomsBrowser rooms={rooms} officeZone={officeZoneLabel()} />;
}
