'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { usePreferences } from '@/components/Preferences';
import { formatTime, userTimeZone } from '@/lib/format';

interface Notice {
  bookingId: string;
  title: string;
  roomName: string;
  endsAt: string;
  nextTitle: string;
}

const POLL_INTERVAL_MS = 60_000;

/**
 * Warns the author when their booking is about to end and the room is taken
 * right after. Polling once a minute is enough for a ten minute window and
 * avoids keeping a socket open for something this rare.
 */
export function EndingSoonToasts({ signedIn }: { signedIn: boolean }) {
  const { t, ready } = usePreferences();
  const [notices, setNotices] = useState<Notice[]>([]);

  const check = useCallback(async () => {
    try {
      const response = await api<{ notices: Notice[] }>('/api/notifications');
      if (response.notices.length > 0) {
        setNotices(response.notices);
        // Marked as seen as soon as they are shown, so a reload does not
        // bring the same notice back.
        await api('/api/notifications', {
          method: 'POST',
          body: JSON.stringify({ bookingIds: response.notices.map((n) => n.bookingId) }),
        });
      }
    } catch {
      // A failed check is not worth showing, the next one is a minute away.
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void check();
    const timer = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [signedIn, check]);

  if (!ready || notices.length === 0) return null;

  const zone = userTimeZone();

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {notices.map((notice) => (
        <div key={notice.bookingId} className="toast">
          <div className="toast-body">
            <span className="toast-title">{t.notifications.endingSoon}</span>
            <span className="toast-text">
              {notice.title}, {notice.roomName}, {t.notifications.until}{' '}
              {formatTime(notice.endsAt, zone)}
            </span>
            <span className="toast-text">
              {t.notifications.nextIsTaken}: {notice.nextTitle}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              setNotices((current) => current.filter((n) => n.bookingId !== notice.bookingId))
            }
          >
            {t.notifications.dismiss}
          </button>
        </div>
      ))}
    </div>
  );
}
