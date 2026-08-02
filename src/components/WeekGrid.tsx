'use client';

import { useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { usePreferences } from '@/components/Preferences';
import { userTimeZone, zoneLabel } from '@/lib/format';

interface Room {
  id: string;
  name: string;
  floor: number;
  capacity: number;
}

export interface OfficeConfig {
  timeZone: string;
  openHour: number;
  closeHour: number;
  slotMinutes: number;
}

export function WeekGrid({ room, office }: { room: Room; office: OfficeConfig }) {
  const { t, locale, ready } = usePreferences();

  const slotsPerDay = ((office.closeHour - office.openHour) * 60) / office.slotMinutes;

  /** Monday 00:00 in office time anchors the whole grid. */
  const [weekStart, setWeekStart] = useState(() =>
    DateTime.now().setZone(office.timeZone).startOf('week'),
  );

  const zone = ready ? userTimeZone() : office.timeZone;
  const now = DateTime.now();

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekStart.plus({ days: index })),
    [weekStart],
  );

  const weekdays = t.grid.weekdays.split(' ');
  const todayIndex = days.findIndex((day) => day.hasSame(now.setZone(office.timeZone), 'day'));

  /**
   * Row index of the current half hour, or -1 outside working hours.
   * Rows are counted from the opening time of the day, not from midnight.
   */
  const nowRow =
    todayIndex >= 0
      ? Math.floor(
          now
            .setZone(office.timeZone)
            .diff(days[todayIndex].set({ hour: office.openHour }), 'minutes').minutes /
            office.slotMinutes,
        )
      : -1;

  const showsShiftedTime = zone !== office.timeZone;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            {room.floor} {t.rooms.floor} · {t.rooms.upTo} {room.capacity} {t.rooms.people}
          </p>
          <h1>{room.name}</h1>
        </div>

        <p className="zone-note">
          {!ready ? (
            t.grid.detectingZone
          ) : showsShiftedTime ? (
            <>
              {t.grid.yourZone}: {zoneLabel(zone)}
              <br />
              {t.grid.officeWorksAt} ({zoneLabel(office.timeZone)})
            </>
          ) : (
            <>
              {t.grid.yourZoneMatches}
              <br />
              {zoneLabel(office.timeZone)} · {t.rooms.workingHours}
            </>
          )}
        </p>
      </div>

      <div className="week-bar">
        <button type="button" className="btn btn-sm" onClick={() => setWeekStart((w) => w.minus({ weeks: 1 }))}>
          ← {t.grid.prevWeek}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setWeekStart(DateTime.now().setZone(office.timeZone).startOf('week'))}
        >
          {t.grid.thisWeek}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setWeekStart((w) => w.plus({ weeks: 1 }))}>
          {t.grid.nextWeek} →
        </button>
        <span className="week-label">
          {weekStart.setLocale(locale).toFormat('d MMM')} –{' '}
          {weekStart.plus({ days: 6 }).setLocale(locale).toFormat('d MMM yyyy')}
        </span>
      </div>

      <div className="grid-scroll">
        <div className="grid">
          <div className="grid-corner" style={{ gridColumn: 1, gridRow: 1 }} />

          {days.map((day, dayIndex) => (
            <div
              key={day.toISODate()}
              className={`grid-head${dayIndex === todayIndex ? ' is-today' : ''}`}
              style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
            >
              <span className="dow">{weekdays[dayIndex]}</span>
              <span className="dom">{day.toFormat('d')}</span>
            </div>
          ))}

          {Array.from({ length: slotsPerDay }, (_, row) => {
            // Row labels are converted to the browser timezone: the same grid,
            // shifted, which is what the spec asks for.
            const anchor = days[0]
              .set({ hour: office.openHour })
              .plus({ minutes: row * office.slotMinutes });

            return (
              <div
                key={`label-${row}`}
                className={`time-label${row === nowRow ? ' is-now' : ''}`}
                style={{ gridColumn: 1, gridRow: row + 2 }}
              >
                {anchor.setZone(zone).toFormat('HH:mm')}
              </div>
            );
          })}

          {days.map((day, dayIndex) =>
            Array.from({ length: slotsPerDay }, (_, row) => {
              const slotStart = day
                .set({ hour: office.openHour })
                .plus({ minutes: row * office.slotMinutes });
              const isPast = slotStart < now;

              return (
                <button
                  key={`${dayIndex}:${row}`}
                  type="button"
                  className={[
                    'slot',
                    dayIndex === todayIndex ? 'is-today-col' : '',
                    dayIndex === todayIndex && row === nowRow ? 'is-now' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ gridColumn: dayIndex + 2, gridRow: row + 2 }}
                  disabled={isPast}
                  aria-label={`${slotStart.setZone(zone).toFormat('d MMM, HH:mm')} ${
                    isPast ? t.grid.slotPast : t.grid.slotFree
                  }`}
                />
              );
            }),
          )}

          {/* Rows are labelled with slot starts, so the last one reads 18:30.
              This strip marks the actual end of the working day. */}
          <div className="time-close" style={{ gridRow: slotsPerDay + 2 }}>
            {days[0].set({ hour: office.closeHour }).setZone(zone).toFormat('HH:mm')}
          </div>
          {days.map((day, dayIndex) => (
            <div
              key={`close-${day.toISODate()}`}
              className="day-close"
              style={{ gridColumn: dayIndex + 2, gridRow: slotsPerDay + 2 }}
            />
          ))}
        </div>
      </div>

      <div className="legend">
        <span>
          <i style={{ background: 'var(--accent)' }} /> {t.grid.legendMine}
        </span>
        <span>
          <i style={{ background: 'var(--neutral)' }} /> {t.grid.legendOthers}
        </span>
        <span>
          <i style={{ background: 'var(--danger)' }} /> {t.grid.legendNow}
        </span>
        <span>{t.grid.legendFree}</span>
      </div>
    </main>
  );
}
