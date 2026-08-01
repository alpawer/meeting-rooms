import { describe, expect, it } from 'vitest';
import { isAlignedToSlot, officeZoneLabel } from '@/lib/office';

describe('officeZoneLabel', () => {
  it('shows UTC+3 during summer time', () => {
    expect(officeZoneLabel(new Date('2027-06-08T12:00:00Z'))).toBe('Europe/Kyiv, UTC+3');
  });

  it('shows UTC+2 during winter time', () => {
    expect(officeZoneLabel(new Date('2027-12-08T12:00:00Z'))).toBe('Europe/Kyiv, UTC+2');
  });
});

describe('isAlignedToSlot', () => {
  it('accepts whole and half hours', () => {
    expect(isAlignedToSlot(new Date('2027-06-08T07:00:00Z'))).toBe(true);
    expect(isAlignedToSlot(new Date('2027-06-08T07:30:00Z'))).toBe(true);
  });

  it('rejects other minutes', () => {
    expect(isAlignedToSlot(new Date('2027-06-08T07:15:00Z'))).toBe(false);
    expect(isAlignedToSlot(new Date('2027-06-08T07:01:00Z'))).toBe(false);
  });

  it('rejects leftover seconds and milliseconds', () => {
    expect(isAlignedToSlot(new Date('2027-06-08T07:00:01Z'))).toBe(false);
    expect(isAlignedToSlot(new Date('2027-06-08T07:00:00.001Z'))).toBe(false);
  });
});
