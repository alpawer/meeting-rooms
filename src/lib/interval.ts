/**
 * Interval overlap logic.
 *
 * Intervals are half open: [start, end). Because of that, back to back
 * bookings never conflict. The end of one may equal the start of another.
 * No special case is needed, it falls out of the model.
 */

export interface Interval {
  /** Start, inclusive. */
  start: Date;
  /** End, exclusive. */
  end: Date;
}

/**
 * Whether two half open intervals overlap.
 * Touching bounds, where a.end equals b.start, is not an overlap.
 */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** An interval is valid when the start is strictly before the end. */
export function isValidInterval(interval: Interval): boolean {
  return interval.start.getTime() < interval.end.getTime();
}

/** First interval from the list that conflicts with the candidate, or null. */
export function findConflict<T extends Interval>(
  candidate: Interval,
  existing: readonly T[],
): T | null {
  return existing.find((item) => intervalsOverlap(candidate, item)) ?? null;
}

/** Interval length in minutes. */
export function durationMinutes(interval: Interval): number {
  return (interval.end.getTime() - interval.start.getTime()) / 60_000;
}
