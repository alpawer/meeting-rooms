'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { ApiError, api } from '@/lib/client-api';
import { usePreferences } from '@/components/Preferences';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatWhen, userTimeZone } from '@/lib/format';
import type { BookingDto } from '@/lib/bookings';

type Scope = 'upcoming' | 'past';

export function MyBookings({ officeTimeZone }: { officeTimeZone: string }) {
  const { t, locale, ready } = usePreferences();
  const router = useRouter();

  /**
   * The tab lives in the URL, not only in state. Otherwise a reload would
   * throw the user back to upcoming, and the tab could not be linked to.
   */
  const searchParams = useSearchParams();
  const scope: Scope = searchParams.get('scope') === 'past' ? 'past' : 'upcoming';

  function selectScope(next: Scope) {
    // Both tabs name themselves in the URL so the address says what is on
    // screen. push rather than replace, so the back button steps between
    // tabs instead of jumping off the page.
    router.push(`/my?scope=${next}`);
  }
  const [items, setItems] = useState<BookingDto[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [pendingCancel, setPendingCancel] = useState<BookingDto | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const zone = ready ? userTimeZone() : officeTimeZone;

  const fetchPage = useCallback(
    async (nextScope: Scope, nextPage: number, append: boolean) => {
      setError(null);
      if (append) setLoadingMore(true);
      else setItems(null);

      try {
        const response = await api<{ items: BookingDto[]; hasMore: boolean }>(
          `/api/bookings/mine?scope=${nextScope}&page=${nextPage}`,
          { headers: { 'Accept-Language': locale } },
        );
        setItems((prev) => (append && prev ? [...prev, ...response.items] : response.items));
        setHasMore(response.hasMore);
        setPage(nextPage);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : t.ui.somethingWentWrong);
      } finally {
        setLoadingMore(false);
      }
    },
    [locale, t.ui.somethingWentWrong],
  );

  useEffect(() => {
    void fetchPage(scope, 0, false);
  }, [scope, fetchPage]);

  /** Opens the room schedule on the week the booking belongs to. */
  function openInGrid(booking: BookingDto) {
    const week = DateTime.fromISO(booking.startsAt, { zone: officeTimeZone })
      .startOf('week')
      .toISODate();
    router.push(`/rooms/${booking.roomId}?week=${week}`);
  }

  async function cancelBooking() {
    if (!pendingCancel) return;
    setCancelling(true);
    try {
      await api(`/api/bookings/${pendingCancel.id}`, {
        method: 'DELETE',
        headers: { 'Accept-Language': locale },
      });
      setPendingCancel(null);
      await fetchPage(scope, 0, false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.confirm.cancelFailed);
      setPendingCancel(null);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t.ui.appName}</p>
          <h1>{t.mine.title}</h1>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={scope === 'upcoming'}
          onClick={() => selectScope('upcoming')}
        >
          {t.mine.upcoming}
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={scope === 'past'}
          onClick={() => selectScope('past')}
        >
          {t.mine.past}
        </button>
      </div>

      {error ? (
        <div className="card state">
          <h3>{t.mine.loadFailed}</h3>
          <p>{error}</p>
          <button type="button" className="btn" onClick={() => void fetchPage(scope, 0, false)}>
            {t.ui.retry}
          </button>
        </div>
      ) : !items ? (
        <div className="booking-list">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton" style={{ height: 62 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card state">
          <h3>{scope === 'upcoming' ? t.mine.emptyUpcomingTitle : t.mine.emptyPastTitle}</h3>
          <p>{scope === 'upcoming' ? t.mine.emptyUpcomingText : t.mine.emptyPastText}</p>
          {scope === 'upcoming' && (
            <button type="button" className="btn btn-primary" onClick={() => router.push('/rooms')}>
              {t.mine.toRooms}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="booking-list">
            {items.map((booking) => (
              <div
                key={booking.id}
                className={`card booking-row${scope === 'past' ? ' is-past' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => openInGrid(booking)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openInGrid(booking);
                  }
                }}
              >
                <span className="row-when">
                  {formatWhen(booking.startsAt, booking.endsAt, zone, locale)}
                </span>
                <span className="row-main">
                  <span className="row-title">{booking.title}</span>
                  <span className="row-room">{booking.roomName}</span>
                </span>
                {scope === 'upcoming' && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingCancel(booking);
                    }}
                  >
                    {t.grid.cancelBooking}
                  </button>
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              className="btn"
              style={{ marginTop: 14 }}
              disabled={loadingMore}
              onClick={() => void fetchPage(scope, page + 1, true)}
            >
              {loadingMore ? t.mine.loadingMore : t.mine.showMore}
            </button>
          )}
        </>
      )}

      {pendingCancel && (
        <ConfirmDialog
          title={t.confirm.cancelTitle}
          description={`${pendingCancel.title}, ${pendingCancel.roomName}. ${t.confirm.cancelText}`}
          confirmLabel={t.confirm.confirmCancel}
          pending={cancelling}
          onConfirm={() => void cancelBooking()}
          onCancel={() => setPendingCancel(null)}
        />
      )}
    </main>
  );
}
