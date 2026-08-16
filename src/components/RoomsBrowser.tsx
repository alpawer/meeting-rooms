'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePreferences } from '@/components/Preferences';
import { fmt } from '@/lib/messages';

interface Room {
  id: string;
  name: string;
  floor: number;
  capacity: number;
}

const CAPACITY_FILTERS = [0, 4, 8, 12] as const;

export function RoomsBrowser({
  rooms,
  officeZone,
  openHour,
  closeHour,
}: {
  rooms: Room[];
  officeZone: string;
  openHour: number;
  closeHour: number;
}) {
  const { t } = usePreferences();
  const [minCapacity, setMinCapacity] = useState(0);

  const visible = useMemo(
    () => rooms.filter((room) => room.capacity >= minCapacity),
    [rooms, minCapacity],
  );

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t.rooms.pickRoom}</p>
          <h1>{t.rooms.title}</h1>
        </div>
        <p className="zone-note">
          {fmt(t.rooms.workingHours, { open: openHour, close: closeHour })}
          <br />
          {t.rooms.officeTime}: {officeZone}
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="card state">
          <h3>{t.rooms.emptyTitle}</h3>
          <p>{t.rooms.emptyText}</p>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <span>{t.rooms.capacityFrom}:</span>
            {CAPACITY_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className="chip"
                aria-pressed={minCapacity === value}
                onClick={() => setMinCapacity(value)}
              >
                {value === 0 ? t.rooms.anyCapacity : `${value}+`}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="card state">
              <h3>{t.rooms.noMatchTitle}</h3>
              <p>
                {t.rooms.noMatchText} {Math.max(...rooms.map((room) => room.capacity))}{' '}
                {t.rooms.people}.
              </p>
              <button type="button" className="btn" onClick={() => setMinCapacity(0)}>
                {t.rooms.showAll}
              </button>
            </div>
          ) : (
            <div className="room-grid">
              {visible.map((room) => (
                <Link key={room.id} href={`/rooms/${room.id}`} className="card room-card">
                  <span className="room-name">{room.name}</span>
                  <span className="room-meta">
                    {room.floor} {t.rooms.floor} · {t.rooms.upTo} {room.capacity} {t.rooms.people}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
