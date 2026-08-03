'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { DateTime } from 'luxon';
import { ApiError, api } from '@/lib/client-api';
import { usePreferences } from '@/components/Preferences';
import type { OfficeConfig } from '@/components/WeekGrid';

interface Props {
  room: { id: string; name: string };
  zone: string;
  office: OfficeConfig;
  start: DateTime;
  /** Minutes free from this slot until the next booking or the closing time. */
  maxMinutes: number;
  onClose: () => void;
  onCreated: () => void;
}

export function BookingDialog({ room, zone, office, start, maxMinutes, onClose, onCreated }: Props) {
  const { t, locale } = usePreferences();

  // Only durations that actually fit are offered, otherwise the user would
  // pick four hours and get a taken slot error back.
  const durations = Array.from(
    { length: Math.floor(Math.min(maxMinutes, 240) / office.slotMinutes) },
    (_, index) => (index + 1) * office.slotMinutes,
  );

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(durations[1] ?? durations[0] ?? office.slotMinutes);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const end = start.plus({ minutes: duration });

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} ${t.dialog.minutes}`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0
      ? `${hours} ${t.dialog.hours}`
      : `${hours} ${t.dialog.hours} ${rest} ${t.dialog.minutes}`;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (title.trim().length === 0) {
      setFieldError(t.validation.titleRequired);
      return;
    }

    setPending(true);
    setFormError(null);
    setFieldError(null);

    try {
      await api('/api/bookings', {
        method: 'POST',
        headers: { 'Accept-Language': locale },
        body: JSON.stringify({
          roomId: room.id,
          title: title.trim(),
          startsAt: start.toUTC().toISO(),
          endsAt: end.toUTC().toISO(),
        }),
      });
      onCreated();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'NETWORK') setFormError(t.ui.serverUnavailable);
        else if (error.fields?.title) setFieldError(error.fields.title);
        else setFormError(error.message);
      } else {
        setFormError(t.ui.somethingWentWrong);
      }
      setPending(false);
    }
  }

  if (durations.length === 0) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog.newBooking}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{t.dialog.newBooking}</h2>
        <p className="dialog-sub">
          {room.name} · {start.setZone(zone).setLocale(locale).toFormat('cccc, d MMMM')} ·{' '}
          {start.setZone(zone).toFormat('HH:mm')}–{end.setZone(zone).toFormat('HH:mm')}
          {zone !== office.timeZone && (
            <>
              <br />
              {t.dialog.officeTimeIs}: {start.setZone(office.timeZone).toFormat('HH:mm')}–
              {end.setZone(office.timeZone).toFormat('HH:mm')}
            </>
          )}
        </p>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span className="field-label">{t.dialog.titleLabel}</span>
            <input
              ref={titleRef}
              className="input"
              value={title}
              maxLength={100}
              onChange={(event) => {
                setTitle(event.target.value);
                setFieldError(null);
              }}
              aria-invalid={Boolean(fieldError)}
              placeholder={t.dialog.titlePlaceholder}
            />
            {fieldError && <span className="field-error">{fieldError}</span>}
          </label>

          <label className="field">
            <span className="field-label">{t.dialog.duration}</span>
            <select
              className="select"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            >
              {durations.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatDuration(minutes)}
                </option>
              ))}
            </select>
            <span className="field-hint">
              {t.dialog.freeUntil}: {formatDuration(maxMinutes)}
            </span>
          </label>

          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose} disabled={pending}>
              {t.dialog.close}
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? t.dialog.booking : t.dialog.book}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
