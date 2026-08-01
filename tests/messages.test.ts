import { describe, expect, it } from 'vitest';
import { checkBookingRules } from '@/lib/booking-rules';
import type { Interval } from '@/lib/interval';

const iv = (a: string, b: string): Interval => ({ start: new Date(a), end: new Date(b) });
const now = new Date('2027-06-08T05:00:00Z');
const tooLong = iv('2027-06-08T07:00:00Z', '2027-06-08T11:30:00Z');

describe('rule messages follow the locale', () => {
  it('defaults to Ukrainian', () => {
    expect(checkBookingRules(tooLong, [], now)?.message).toBe('Максимальна тривалість 4 години.');
  });

  it('returns English when asked', () => {
    expect(checkBookingRules(tooLong, [], now, 'en')?.message).toBe('Maximum duration is 4 hours.');
  });

  it('keeps the code stable across locales', () => {
    expect(checkBookingRules(tooLong, [], now, 'uk')?.code).toBe(
      checkBookingRules(tooLong, [], now, 'en')?.code,
    );
  });
});
