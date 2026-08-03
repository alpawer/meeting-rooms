import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { OFFICE_TIMEZONE } from '@/lib/office';
import { MyBookings } from '@/components/MyBookings';

export const dynamic = 'force-dynamic';

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  if (!(await getSessionUser())) redirect('/login');

  // A bare /my redirects to the explicit form, so the address always names
  // the tab that is open.
  const { scope } = await searchParams;
  if (scope !== 'upcoming' && scope !== 'past') redirect('/my?scope=upcoming');

  return <MyBookings officeTimeZone={OFFICE_TIMEZONE} />;
}
