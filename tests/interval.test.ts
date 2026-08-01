import { describe, expect, it } from 'vitest';
import { durationMinutes, findConflict, intervalsOverlap, isValidInterval, type Interval } from '@/lib/interval';

/** Helper: builds an interval from two UTC ISO strings, so tests do not depend on the machine timezone. */
function iv(startIso: string, endIso: string): Interval {
  return { start: new Date(startIso), end: new Date(endIso) };
}

const base = iv('2027-03-10T10:00:00Z', '2027-03-10T11:00:00Z');

describe('intervalsOverlap', () => {
  it('back to back: end of one equals start of the other, no conflict', () => {
    const after = iv('2027-03-10T11:00:00Z', '2027-03-10T12:00:00Z');
    expect(intervalsOverlap(base, after)).toBe(false);
    expect(intervalsOverlap(after, base)).toBe(false);
  });

  it('partial overlap', () => {
    const overlapping = iv('2027-03-10T10:30:00Z', '2027-03-10T11:30:00Z');
    expect(intervalsOverlap(base, overlapping)).toBe(true);
    expect(intervalsOverlap(overlapping, base)).toBe(true);
  });

  it('exact match', () => {
    const same = iv('2027-03-10T10:00:00Z', '2027-03-10T11:00:00Z');
    expect(intervalsOverlap(base, same)).toBe(true);
  });

  it('adjacent days: same time next day, no conflict', () => {
    const nextDay = iv('2027-03-11T10:00:00Z', '2027-03-11T11:00:00Z');
    expect(intervalsOverlap(base, nextDay)).toBe(false);
  });
  it('back to back on the left: new end equals existing start, no conflict', () => {
    const before = iv('2027-03-10T09:00:00Z', '2027-03-10T10:00:00Z');
    expect(intervalsOverlap(before, base)).toBe(false);
    expect(intervalsOverlap(base, before)).toBe(false);
  });

  it('new interval nested inside the existing one', () => {
    const inner = iv('2027-03-10T10:15:00Z', '2027-03-10T10:45:00Z');
    expect(intervalsOverlap(base, inner)).toBe(true);
    expect(intervalsOverlap(inner, base)).toBe(true);
  });

  it('new interval fully covers the existing one', () => {
    const outer = iv('2027-03-10T09:00:00Z', '2027-03-10T12:00:00Z');
    expect(intervalsOverlap(base, outer)).toBe(true);
    expect(intervalsOverlap(outer, base)).toBe(true);
  });

  it('crossing midnight in UTC does not break the comparison', () => {
    const lateNight = iv('2027-03-10T23:00:00Z', '2027-03-11T01:00:00Z');
    const earlyNext = iv('2027-03-11T00:30:00Z', '2027-03-11T02:00:00Z');
    expect(intervalsOverlap(lateNight, earlyNext)).toBe(true);
  });
});

describe('findConflict', () => {
  const existing = [
    iv('2027-03-10T09:00:00Z', '2027-03-10T10:00:00Z'),
    iv('2027-03-10T11:00:00Z', '2027-03-10T12:00:00Z'),
  ];

  it('a free gap between existing bookings is available', () => {
    expect(findConflict(iv('2027-03-10T10:00:00Z', '2027-03-10T11:00:00Z'), existing)).toBeNull();
  });

  it('empty list of existing bookings means no conflict', () => {
    expect(findConflict(base, [])).toBeNull();
  });

  it('returns the interval that actually conflicts', () => {
    const conflict = findConflict(iv('2027-03-10T11:30:00Z', '2027-03-10T13:00:00Z'), existing);
    expect(conflict?.start.toISOString()).toBe('2027-03-10T11:00:00.000Z');
  });
});

describe('isValidInterval / durationMinutes', () => {
  it('zero length interval is invalid', () => {
    expect(isValidInterval(iv('2027-03-10T10:00:00Z', '2027-03-10T10:00:00Z'))).toBe(false);
  });

  it('reversed interval is invalid', () => {
    expect(isValidInterval(iv('2027-03-10T11:00:00Z', '2027-03-10T10:00:00Z'))).toBe(false);
  });

  it('computes length in minutes', () => {
    expect(durationMinutes(base)).toBe(60);
    expect(durationMinutes(iv('2027-03-10T10:00:00Z', '2027-03-10T10:30:00Z'))).toBe(30);
  });
});
