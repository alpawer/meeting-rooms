'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { usePreferences } from '@/components/Preferences';
import { ApiError, api } from '@/lib/client-api';
import { formatRange, userTimeZone, zoneLabel } from '@/lib/format';
import { BookingDialog } from '@/components/BookingDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { BookingDto } from '@/lib/bookings';

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

  const [bookings, setBookings] = useState<BookingDto[] | null>(null);
  const [loadedWeek, setLoadedWeek] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [draftStart, setDraftStart] = useState<DateTime | null>(null);
  const [pendingCancel, setPendingCancel] = useState<BookingDto | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function cancelBooking() {
    if (!pendingCancel) return;
    setCancelling(true);
    setActionError(null);
    try {
      await api(`/api/bookings/${pendingCancel.id}`, {
        method: 'DELETE',
        headers: { 'Accept-Language': locale },
      });
      setPendingCancel(null);
      await load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t.confirm.cancelFailed);
      setPendingCancel(null);
    } finally {
      setCancelling(false);
    }
  }

  /**
   * The previous week stays on screen while the next one loads. Replacing the
   * grid with a shorter skeleton made the legend below jump up and back down.
   */
  const load = useCallback(async () => {
    setLoadError(null);
    setRefreshing(true);
    try {
      const from = weekStart.toUTC().toISO() ?? '';
      const to = weekStart.plus({ weeks: 1 }).toUTC().toISO() ?? '';
      const response = await api<{ bookings: BookingDto[] }>(
        `/api/bookings?roomId=${room.id}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setBookings(response.bookings);
      setLoadedWeek(weekStart.toISODate());
    } catch (error) {
      setLoadError(
        error instanceof ApiError && error.code !== 'NETWORK'
          ? error.message
          : t.ui.serverUnavailable,
      );
    } finally {
      setRefreshing(false);
    }
  }, [room.id, weekStart, t.ui.serverUnavailable]);

  useEffect(() => {
    void load();
  }, [load]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekStart.plus({ days: index })),
    [weekStart],
  );

  /**
   * Maps each booking to the cell it starts in, and marks every cell it covers
   * so no empty button is rendered underneath the block.
   *
   * Nothing is laid out while a different week is loading, otherwise the
   * previous week's blocks would appear under the new dates for a moment.
   */
  const layout = useMemo(() => {
    const startsAt = new Map<string, BookingDto>();
    const covered = new Set<string>();
    if (!bookings || loadedWeek !== weekStart.toISODate()) return { startsAt, covered };

    days.forEach((day, dayIndex) => {
      const open = day.set({ hour: office.openHour });

      for (const booking of bookings) {
        const start = DateTime.fromISO(booking.startsAt, { zone: office.timeZone });
        const end = DateTime.fromISO(booking.endsAt, { zone: office.timeZone });
        if (!start.hasSame(day, 'day')) continue;

        const firstRow = Math.round(start.diff(open, 'minutes').minutes / office.slotMinutes);
        const lastRow = Math.round(end.diff(open, 'minutes').minutes / office.slotMinutes);

        startsAt.set(`${dayIndex}:${firstRow}`, booking);
        for (let row = firstRow; row < lastRow; row += 1) covered.add(`${dayIndex}:${row}`);
      }
    });

    return { startsAt, covered };
  }, [bookings, loadedWeek, weekStart, days, office.openHour, office.slotMinutes, office.timeZone]);

  /** Minutes free from a cell until the next booking or the end of the day. */
  function freeMinutesFrom(dayIndex: number, row: number): number {
    let free = 0;
    for (let cursor = row; cursor < slotsPerDay; cursor += 1) {
      if (layout.covered.has(`${dayIndex}:${cursor}`)) break;
      free += office.slotMinutes;
    }
    return free;
  }

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

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      {loadError ? (
        <div className="card state">
          <h3>{t.grid.loadFailedTitle}</h3>
          <p>{loadError}</p>
          <button type="button" className="btn" onClick={() => void load()}>
            {t.ui.retry}
          </button>
        </div>
      ) : !bookings ? (
        <div className="grid-scroll" style={{ padding: 16 }} aria-busy="true">
          {Array.from({ length: slotsPerDay }, (_, index) => (
            <div key={index} className="skeleton" style={{ height: 32, marginBottom: 6 }} />
          ))}
        </div>
      ) : (
      <div
        className={`grid-scroll${refreshing ? ' is-refreshing' : ''}`}
        aria-busy={refreshing}
      >
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
              const key = `${dayIndex}:${row}`;
              const booking = layout.startsAt.get(key);

              if (booking) {
                const start = DateTime.fromISO(booking.startsAt, { zone: office.timeZone });
                const end = DateTime.fromISO(booking.endsAt, { zone: office.timeZone });
                // Height comes from the duration measured in slots.
                const span = Math.max(
                  1,
                  Math.round(end.diff(start, 'minutes').minutes / office.slotMinutes),
                );

                return (
                  <div
                    key={key}
                    className={`booking${booking.isMine ? ' is-mine' : ''}`}
                    style={{ gridColumn: dayIndex + 2, gridRow: `${row + 2} / span ${span}` }}
                  >
                    <span className="booking-title" title={booking.title}>
                      {booking.title}
                    </span>
                    <span className="booking-meta">
                      {formatRange(booking.startsAt, booking.endsAt, zone)} ·{' '}
                      {booking.isMine ? t.grid.you : booking.userName}
                    </span>
                    {/* Cancelling a booking that already ended makes no sense. */}
                    {booking.isMine && end > now && (
                      <button
                        type="button"
                        className="booking-cancel"
                        onClick={() => setPendingCancel(booking)}
                      >
                        {t.grid.cancelBooking}
                      </button>
                    )}
                  </div>
                );
              }

              // Cells under a block are skipped, the block already covers them.
              if (layout.covered.has(key)) return null;

              const slotStart = day
                .set({ hour: office.openHour })
                .plus({ minutes: row * office.slotMinutes });
              const isPast = slotStart < now;

              return (
                <button
                  key={key}
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
                  onClick={() => setDraftStart(slotStart)}
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
      )}

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

      {draftStart && (
        <BookingDialog
          room={room}
          zone={zone}
          office={office}
          start={draftStart}
          maxMinutes={freeMinutesFrom(
            days.findIndex((day) => day.hasSame(draftStart, 'day')),
            Math.round(
              draftStart.diff(draftStart.set({ hour: office.openHour }), 'minutes').minutes /
                office.slotMinutes,
            ),
          )}
          onClose={() => setDraftStart(null)}
          onCreated={() => {
            setDraftStart(null);
            void load();
          }}
        />
      )}

      {pendingCancel && (
        <ConfirmDialog
          title={t.confirm.cancelTitle}
          description={`${pendingCancel.title}, ${formatRange(
            pendingCancel.startsAt,
            pendingCancel.endsAt,
            zone,
          )}. ${t.confirm.cancelText}`}
          confirmLabel={t.confirm.confirmCancel}
          pending={cancelling}
          onConfirm={() => void cancelBooking()}
          onCancel={() => setPendingCancel(null)}
        />
      )}
    </main>
  );
}
