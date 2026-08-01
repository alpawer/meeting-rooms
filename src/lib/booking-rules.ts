import { durationMinutes, findConflict, isValidInterval, type Interval } from '@/lib/interval';
import {
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
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

const MESSAGES: Record<BookingRuleCode, string> = {
  INVALID_RANGE: 'Час завершення має бути пізніше за час початку.',
  NOT_ALIGNED: 'Час має бути кратним 30 хвилинам.',
  TOO_SHORT: 'Мінімальна тривалість — 30 хвилин.',
  TOO_LONG: 'Максимальна тривалість — 4 години.',
  IN_THE_PAST: 'Бронювати можна лише майбутній час.',
  OUTSIDE_WORKING_HOURS: 'Кімнати доступні з 09:00 до 19:00 за часом офісу.',
  SLOT_TAKEN: 'Цей час уже зайнятий.',
};

function fail(code: BookingRuleCode): BookingRuleFailure {
  return { code, message: MESSAGES[code] };
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
): BookingRuleFailure | null {
  if (!isValidInterval(candidate)) return fail('INVALID_RANGE');
  if (!isAlignedToSlot(candidate.start) || !isAlignedToSlot(candidate.end)) {
    return fail('NOT_ALIGNED');
  }

  const minutes = durationMinutes(candidate);
  if (minutes < MIN_DURATION_MINUTES) return fail('TOO_SHORT');
  if (minutes > MAX_DURATION_MINUTES) return fail('TOO_LONG');

  if (candidate.start.getTime() < now.getTime()) return fail('IN_THE_PAST');
  if (!isWithinWorkingHours(candidate.start, candidate.end)) {
    return fail('OUTSIDE_WORKING_HOURS');
  }

  if (findConflict(candidate, existing)) return fail('SLOT_TAKEN');

  return null;
}
