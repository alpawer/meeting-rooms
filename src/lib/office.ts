import { DateTime } from 'luxon';

/**
 * Single place that owns the office time rules.
 *
 * Time contract in this project:
 *  - the database and the API always use UTC;
 *  - office hours are validated in the office timezone;
 *  - the UI renders in the browser timezone.
 */

export const OFFICE_TIMEZONE = process.env.OFFICE_TIMEZONE ?? 'Europe/Kyiv';
export const OPEN_HOUR = Number(process.env.OFFICE_OPEN_HOUR ?? 9);
export const CLOSE_HOUR = Number(process.env.OFFICE_CLOSE_HOUR ?? 19);

/** How long before a booking ends its author is warned, in minutes. */
export const NOTIFY_BEFORE_MINUTES = Number(process.env.NOTIFY_BEFORE_MINUTES ?? 10);

export const SLOT_MINUTES = 30;
export const MIN_DURATION_MINUTES = 30;
export const MAX_DURATION_MINUTES = 240;

/** Day key as yyyy-MM-dd in the office calendar. */
function officeDayKey(instant: Date): string {
  return DateTime.fromJSDate(instant, { zone: OFFICE_TIMEZONE }).toFormat('yyyy-MM-dd');
}

/**
 * Working day bounds.
 *
 * The hour is set with set({ hour }) rather than added with plus({ hours }).
 * plus adds real elapsed time, so on a DST transition day nine hours after
 * midnight lands on 10:00 instead of 09:00, shifting the whole office window.
 */
function workingDayStart(dayKey: string): Date {
  return DateTime.fromISO(dayKey, { zone: OFFICE_TIMEZONE })
    .startOf('day')
    .set({ hour: OPEN_HOUR })
    .toJSDate();
}

function workingDayEnd(dayKey: string): Date {
  return DateTime.fromISO(dayKey, { zone: OFFICE_TIMEZONE })
    .startOf('day')
    .set({ hour: CLOSE_HOUR })
    .toJSDate();
}

/** Whether the instant sits on a 30 minute boundary, with no leftover seconds. */
export function isAlignedToSlot(instant: Date): boolean {
  return instant.getTime() % (SLOT_MINUTES * 60_000) === 0;
}

/**
 * Whether the interval fits entirely inside the working hours of a single
 * office day. Bookings crossing midnight are rejected.
 */
export function isWithinWorkingHours(start: Date, end: Date): boolean {
  const dayKey = officeDayKey(start);
  const open = workingDayStart(dayKey).getTime();
  const close = workingDayEnd(dayKey).getTime();
  return start.getTime() >= open && end.getTime() <= close && end.getTime() > start.getTime();
}

/**
 * Office timezone label for the UI, for example Europe/Kyiv, UTC+3.
 *
 * The offset is built from offset minutes rather than Luxon's ZZ token,
 * which renders +03:00. Whole hours read better in the interface, and
 * half hour zones still render correctly as +05:30.
 */
export function officeZoneLabel(at: Date = new Date()): string {
  const offsetMinutes = DateTime.fromJSDate(at, { zone: OFFICE_TIMEZONE }).offset;
  const sign = offsetMinutes < 0 ? '-' : '+';
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const offset = minutes === 0 ? `${hours}` : `${hours}:${String(minutes).padStart(2, '0')}`;
  return `${OFFICE_TIMEZONE}, UTC${sign}${offset}`;
}
