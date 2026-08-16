import { durationMinutes, findConflict, isValidInterval, type Interval } from '@/lib/interval';
import { DEFAULT_LOCALE, fmt, messages, type Locale } from '@/lib/messages';
import {
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  OPEN_HOUR,
  CLOSE_HOUR,
  isAlignedToSlot,
  isWithinWorkingHours,
} from '@/lib/office';

export type BookingRuleCode =
  | 'INVALID_RANGE'
  | 'NOT_ALIGNED'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'IN_THE_PAST'
  | 'OUTSIDE_WORKING_HOURS'
  | 'SLOT_TAKEN';

export interface BookingRuleFailure {
  code: BookingRuleCode;
  message: string;
}

const CODE_TO_KEY: Record<BookingRuleCode, keyof ReturnType<typeof messages>['booking']> = {
  INVALID_RANGE: 'invalidRange',
  NOT_ALIGNED: 'notAligned',
  TOO_SHORT: 'tooShort',
  TOO_LONG: 'tooLong',
  IN_THE_PAST: 'inThePast',
  OUTSIDE_WORKING_HOURS: 'outsideWorkingHours',
  SLOT_TAKEN: 'slotTaken',
};

function fail(code: BookingRuleCode, locale: Locale): BookingRuleFailure {
  return { code, message: messages(locale).booking[CODE_TO_KEY[code]] };
}

/**
 * Checks every booking rule except the title, which is validated by a zod
 * schema. Returns null when the booking is allowed.
 *
 * `now` is passed in rather than read from Date.now() so that the rules can
 * be tested deterministically.
 */
export function checkBookingRules(
  candidate: Interval,
  existing: readonly Interval[],
  now: Date,
  locale: Locale = DEFAULT_LOCALE,
): BookingRuleFailure | null {
  if (!isValidInterval(candidate)) return fail('INVALID_RANGE', locale);
  if (!isAlignedToSlot(candidate.start) || !isAlignedToSlot(candidate.end)) {
    return fail('NOT_ALIGNED', locale);
  }

  const minutes = durationMinutes(candidate);
  if (minutes < MIN_DURATION_MINUTES) return fail('TOO_SHORT', locale);
  if (minutes > MAX_DURATION_MINUTES) return fail('TOO_LONG', locale);

  if (candidate.start.getTime() < now.getTime()) return fail('IN_THE_PAST', locale);
  if (!isWithinWorkingHours(candidate.start, candidate.end)) {
    const msg = fmt(messages(locale).booking.outsideWorkingHours, { open: OPEN_HOUR, close: CLOSE_HOUR });
    return { code: 'OUTSIDE_WORKING_HOURS', message: msg };
  }

  if (findConflict(candidate, existing)) return fail('SLOT_TAKEN', locale);

  return null;
}
