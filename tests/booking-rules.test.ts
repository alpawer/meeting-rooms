import { describe, expect, it } from 'vitest';
import { checkBookingRules } from '@/lib/booking-rules';
import type { Interval } from '@/lib/interval';

const iv = (startIso: string, endIso: string): Interval => ({
  start: new Date(startIso),
  end: new Date(endIso),
});

/** June 2027, Kyiv is on UTC+3: local 09:00 is 06:00 UTC, local 19:00 is 16:00 UTC. */
const now = new Date('2027-06-08T05:00:00Z'); // 08:00 Kyiv time, before opening

describe('checkBookingRules', () => {
  it('accepts a valid booking', () => {
    expect(checkBookingRules(iv('2027-06-08T07:00:00Z', '2027-06-08T08:00:00Z'), [], now)).toBeNull();
  });

  it('rejects a time not aligned to 30 minutes', () => {
    expect(
      checkBookingRules(iv('2027-06-08T07:10:00Z', '2027-06-08T08:10:00Z'), [], now)?.code,
    ).toBe('NOT_ALIGNED');
  });

  it('accepts exactly 30 minutes', () => {
    expect(checkBookingRules(iv('2027-06-08T07:00:00Z', '2027-06-08T07:30:00Z'), [], now)).toBeNull();
  });

  it('accepts exactly 4 hours', () => {
    expect(checkBookingRules(iv('2027-06-08T07:00:00Z', '2027-06-08T11:00:00Z'), [], now)).toBeNull();
  });

  it('rejects 4 hours 30 minutes', () => {
    expect(
      checkBookingRules(iv('2027-06-08T07:00:00Z', '2027-06-08T11:30:00Z'), [], now)?.code,
    ).toBe('TOO_LONG');
  });

  it('rejects a time in the past', () => {
    expect(
      checkBookingRules(iv('2027-06-07T07:00:00Z', '2027-06-07T08:00:00Z'), [], now)?.code,
    ).toBe('IN_THE_PAST');
  });

  it('rejects a start before 09:00 office time', () => {
    expect(
      checkBookingRules(iv('2027-06-08T05:30:00Z', '2027-06-08T06:30:00Z'), [], now)?.code,
    ).toBe('OUTSIDE_WORKING_HOURS');
  });

  it('accepts a booking ending exactly at 19:00 office time', () => {
    expect(checkBookingRules(iv('2027-06-08T15:00:00Z', '2027-06-08T16:00:00Z'), [], now)).toBeNull();
  });

  it('rejects an end after 19:00 office time', () => {
    expect(
      checkBookingRules(iv('2027-06-08T15:30:00Z', '2027-06-08T16:30:00Z'), [], now)?.code,
    ).toBe('OUTSIDE_WORKING_HOURS');
  });

  it('rejects a booking crossing midnight', () => {
    expect(
      checkBookingRules(iv('2027-06-08T15:00:00Z', '2027-06-09T07:00:00Z'), [], now)?.code,
    ).toBe('TOO_LONG');
  });

  it('rejects milliseconds in the timestamp', () => {
    expect(
      checkBookingRules(iv('2027-06-08T07:00:00.500Z', '2027-06-08T08:00:00Z'), [], now)?.code,
    ).toBe('NOT_ALIGNED');
  });

  it('rejects a reversed interval before checking anything else', () => {
    const existing = [iv('2027-06-08T07:00:00Z', '2027-06-08T08:00:00Z')];
    expect(
      checkBookingRules(iv('2027-06-08T08:00:00Z', '2027-06-08T07:00:00Z'), existing, now)?.code,
    ).toBe('INVALID_RANGE');
  });

  it('rejects a taken slot', () => {
    const existing = [iv('2027-06-08T07:00:00Z', '2027-06-08T08:00:00Z')];
    expect(
      checkBookingRules(iv('2027-06-08T07:30:00Z', '2027-06-08T08:30:00Z'), existing, now)?.code,
    ).toBe('SLOT_TAKEN');
  });

  it('allows a booking back to back with an existing one', () => {
    const existing = [iv('2027-06-08T07:00:00Z', '2027-06-08T08:00:00Z')];
    expect(
      checkBookingRules(iv('2027-06-08T08:00:00Z', '2027-06-08T09:00:00Z'), existing, now),
    ).toBeNull();
  });
});

/**
 * DST transition days are where working hour arithmetic breaks.
 *
 * Expected instants are written by hand rather than derived with the same
 * formula the code uses. Otherwise the test would repeat the bug and catch
 * nothing.
 *
 * On 2027-03-28 Kyiv moves to UTC+3, so local 09:00 is 06:00 UTC and local
 * 19:00 is 16:00 UTC.
 */
describe('DST start day, 2027-03-28', () => {
  const dstNow = new Date('2027-03-28T04:00:00Z');

  it('allows 09:00 to 10:00 office time', () => {
    expect(
      checkBookingRules(iv('2027-03-28T06:00:00Z', '2027-03-28T07:00:00Z'), [], dstNow),
    ).toBeNull();
  });

  it('rejects 08:00 to 09:00, before opening', () => {
    expect(
      checkBookingRules(iv('2027-03-28T05:00:00Z', '2027-03-28T06:00:00Z'), [], dstNow)?.code,
    ).toBe('OUTSIDE_WORKING_HOURS');
  });

  it('allows 18:00 to 19:00 office time', () => {
    expect(
      checkBookingRules(iv('2027-03-28T15:00:00Z', '2027-03-28T16:00:00Z'), [], dstNow),
    ).toBeNull();
  });

  it('rejects 19:00 to 20:00, after closing', () => {
    expect(
      checkBookingRules(iv('2027-03-28T16:00:00Z', '2027-03-28T17:00:00Z'), [], dstNow)?.code,
    ).toBe('OUTSIDE_WORKING_HOURS');
  });
});

/** On 2027-10-31 Kyiv returns to UTC+2, so local 09:00 is 07:00 UTC and local 19:00 is 17:00 UTC. */
describe('DST end day, 2027-10-31', () => {
  const stdNow = new Date('2027-10-31T04:00:00Z');

  it('allows 09:00 to 10:00 office time', () => {
    expect(
      checkBookingRules(iv('2027-10-31T07:00:00Z', '2027-10-31T08:00:00Z'), [], stdNow),
    ).toBeNull();
  });

  it('allows 18:00 to 19:00 office time', () => {
    expect(
      checkBookingRules(iv('2027-10-31T16:00:00Z', '2027-10-31T17:00:00Z'), [], stdNow),
    ).toBeNull();
  });

  it('rejects 19:00 to 20:00, after closing', () => {
    expect(
      checkBookingRules(iv('2027-10-31T17:00:00Z', '2027-10-31T18:00:00Z'), [], stdNow)?.code,
    ).toBe('OUTSIDE_WORKING_HOURS');
  });
});
