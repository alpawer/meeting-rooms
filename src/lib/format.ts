import { DateTime } from 'luxon';

/** Browser timezone. Falls back to UTC during a server render. */
export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function zoneLabel(zone: string, at: Date = new Date()): string {
  const offsetMinutes = DateTime.fromJSDate(at, { zone }).offset;
  const sign = offsetMinutes < 0 ? '-' : '+';
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const offset = minutes === 0 ? `${hours}` : `${hours}:${String(minutes).padStart(2, '0')}`;
  return `${zone}, UTC${sign}${offset}`;
}

export function formatTime(iso: string, zone: string): string {
  return DateTime.fromISO(iso, { zone }).toFormat('HH:mm');
}

export function formatRange(startIso: string, endIso: string, zone: string): string {
  return `${formatTime(startIso, zone)}–${formatTime(endIso, zone)}`;
}
