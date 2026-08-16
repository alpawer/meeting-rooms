import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { intervalsOverlap, isValidInterval, durationMinutes, type Interval } from '@/lib/interval';
import { isAlignedToSlot, isWithinWorkingHours, SLOT_MINUTES, OPEN_HOUR, CLOSE_HOUR } from '@/lib/office';
import { checkBookingRules } from '@/lib/booking-rules';

/** Arbitrary UTC timestamp aligned to 30-minute grid. */
const alignedMs = fc
  .integer({ min: 0, max: 365 * 24 * 2 - 1 }) // up to a year of 30-min slots
  .map((n) => n * SLOT_MINUTES * 60_000 + Date.UTC(2027, 0, 1));

const alignedDate = alignedMs.map((ms) => new Date(ms));

const intervalArb: fc.Arbitrary<Interval> = fc
  .tuple(alignedMs, fc.integer({ min: 1, max: 16 }))
  .map(([start, slots]) => ({ start: new Date(start), end: new Date(start + slots * SLOT_MINUTES * 60_000) }));

describe('intervalsOverlap — invariants', () => {
  it('is symmetric', () => {
    fc.assert(
      fc.property(intervalArb, intervalArb, (a, b) => {
        expect(intervalsOverlap(a, b)).toBe(intervalsOverlap(b, a));
      }),
    );
  });

  it('an interval always overlaps itself', () => {
    fc.assert(
      fc.property(intervalArb, (a) => {
        expect(intervalsOverlap(a, a)).toBe(true);
      }),
    );
  });

  it('non-overlapping means one ends before the other starts', () => {
    fc.assert(
      fc.property(intervalArb, intervalArb, (a, b) => {
        if (!intervalsOverlap(a, b)) {
          const separated = a.end.getTime() <= b.start.getTime() || b.end.getTime() <= a.start.getTime();
          expect(separated).toBe(true);
        }
      }),
    );
  });

  it('touching intervals (end == start) never overlap', () => {
    fc.assert(
      fc.property(alignedMs, fc.integer({ min: 1, max: 8 }), fc.integer({ min: 1, max: 8 }), (t, slotsA, slotsB) => {
        const unit = SLOT_MINUTES * 60_000;
        const a: Interval = { start: new Date(t), end: new Date(t + slotsA * unit) };
        const b: Interval = { start: new Date(t + slotsA * unit), end: new Date(t + slotsA * unit + slotsB * unit) };
        expect(intervalsOverlap(a, b)).toBe(false);
        expect(intervalsOverlap(b, a)).toBe(false);
      }),
    );
  });
});

describe('isValidInterval / durationMinutes — invariants', () => {
  it('valid interval always has positive duration', () => {
    fc.assert(
      fc.property(intervalArb, (iv) => {
        expect(isValidInterval(iv)).toBe(true);
        expect(durationMinutes(iv)).toBeGreaterThan(0);
      }),
    );
  });

  it('reversed interval is always invalid', () => {
    fc.assert(
      fc.property(intervalArb, (iv) => {
        expect(isValidInterval({ start: iv.end, end: iv.start })).toBe(false);
      }),
    );
  });
});

describe('isAlignedToSlot — invariants', () => {
  it('any slot-grid instant is aligned', () => {
    fc.assert(
      fc.property(alignedDate, (d) => {
        expect(isAlignedToSlot(d)).toBe(true);
      }),
    );
  });

  it('adding 1–29 seconds breaks alignment', () => {
    fc.assert(
      fc.property(alignedDate, fc.integer({ min: 1, max: 29 * 60 - 1 }), (d, offsetSec) => {
        const shifted = new Date(d.getTime() + offsetSec * 1000);
        expect(isAlignedToSlot(shifted)).toBe(false);
      }),
    );
  });
});

describe('isWithinWorkingHours — invariants', () => {
  it('any valid office-hour booking stays inside [open, close]', () => {
    // Build a slot that fits in a single office day.
    // Date range: 2027-01-06 to 2027-03-27 (UTC+2 winter, before DST jump on 2027-03-28).
    const officeSlotArb = fc
      .tuple(
        fc.integer({ min: 0, max: 79 }),    // 80 days: Jan 6 – Mar 27 (all UTC+2 winter)
        fc.integer({ min: 0, max: (CLOSE_HOUR - OPEN_HOUR) * 2 - 1 }), // slot index
        fc.integer({ min: 1, max: Math.min(8, (CLOSE_HOUR - OPEN_HOUR) * 2) }), // duration in slots
      )
      .filter(([, startSlot, dur]) => startSlot + dur <= (CLOSE_HOUR - OPEN_HOUR) * 2)
      .map(([dayOffset, startSlot, dur]) => {
        // UTC+2 is stable throughout this window.
        const UTC_OFFSET_MS = 2 * 60 * 60_000;
        const dayMs = Date.UTC(2027, 0, 6 + dayOffset); // 2027-01-06 is a Wednesday
        const openMs = dayMs + OPEN_HOUR * 3_600_000 - UTC_OFFSET_MS;
        const start = new Date(openMs + startSlot * SLOT_MINUTES * 60_000);
        const end = new Date(start.getTime() + dur * SLOT_MINUTES * 60_000);
        return { start, end };
      });

    fc.assert(
      fc.property(officeSlotArb, ({ start, end }) => {
        expect(isWithinWorkingHours(start, end)).toBe(true);
      }),
    );
  });
});

describe('checkBookingRules — invariants', () => {
  /** A slot guaranteed to be in the future (2027) and in office hours.
   *  Date range: 2027-04-01 to 2027-10-30 (all UTC+3 summer, no DST transitions). */
  const safeSlot = fc
    .tuple(
      fc.integer({ min: 0, max: 211 }), // 212 days: Apr 1 – Oct 30 (all UTC+3 summer)
      fc.integer({ min: 0, max: 18 }),   // slot index: 0=09:00 … 18=18:30 (UTC+3 = UTC+3 offset)
      fc.integer({ min: 1, max: 7 }),    // duration slots
    )
    .filter(([, start, dur]) => start + dur <= 20)
    .map(([dayOff, startSlot, dur]) => {
      // UTC+3 is stable throughout Apr 1 – Oct 30; 09:00 Kyiv = 06:00 UTC.
      const base = Date.UTC(2027, 3, 1 + dayOff, 6, 0, 0);
      const s = new Date(base + startSlot * SLOT_MINUTES * 60_000);
      const e = new Date(s.getTime() + dur * SLOT_MINUTES * 60_000);
      return { start: s, end: e };
    });

  const nowBefore2027 = new Date('2027-01-01T00:00:00Z');

  it('a valid slot with no conflicts always returns null', () => {
    fc.assert(
      fc.property(safeSlot, ({ start, end }) => {
        expect(checkBookingRules({ start, end }, [], nowBefore2027)).toBeNull();
      }),
    );
  });

  it('a slot conflicting with itself always returns SLOT_TAKEN', () => {
    fc.assert(
      fc.property(safeSlot, ({ start, end }) => {
        const result = checkBookingRules({ start, end }, [{ start, end }], nowBefore2027);
        expect(result?.code).toBe('SLOT_TAKEN');
      }),
    );
  });

  it('error code is always stable across locales', () => {
    fc.assert(
      fc.property(intervalArb, (iv) => {
        const uk = checkBookingRules(iv, [], nowBefore2027);
        const en = checkBookingRules(iv, [], nowBefore2027, 'en');
        expect(uk?.code).toBe(en?.code);
      }),
    );
  });
});
