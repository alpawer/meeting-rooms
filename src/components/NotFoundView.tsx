'use client';

import Link from 'next/link';
import { usePreferences } from '@/components/Preferences';

export function NotFoundView() {
  const { t } = usePreferences();

  return (
    <main className="page">
      <div className="card state" style={{ maxWidth: 460, margin: '48px auto' }}>
        <p className="eyebrow">404</p>
        <h3>{t.ui.notFoundTitle}</h3>
        <p>{t.ui.notFoundText}</p>
        <Link href="/rooms" className="btn btn-primary">
          {t.ui.backToRooms}
        </Link>
      </div>
    </main>
  );
}
