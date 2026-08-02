import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { forbidden, localeFrom, notFound, unauthorized } from '@/lib/http';
import { cancelBooking } from '@/lib/bookings';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = localeFrom(request);
  const user = await getSessionUser();
  if (!user) return unauthorized(locale);

  const { id } = await params;
  const result = await cancelBooking(id, user.id);

  if (result === 'not_found') return notFound(locale);
  if (result === 'forbidden') return forbidden(locale);

  return NextResponse.json({ ok: true });
}
