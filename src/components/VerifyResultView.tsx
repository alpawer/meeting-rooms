'use client';

import Link from 'next/link';
import { usePreferences } from '@/components/Preferences';

export function VerifyResultView({ ok }: { ok: boolean }) {
  const { t } = usePreferences();

  return (
    <main className="page">
      <div className="card state" style={{ maxWidth: 460, margin: '48px auto' }}>
        <h3>{ok ? t.verify.successTitle : t.verify.failTitle}</h3>
        <p>{ok ? t.verify.successText : t.verify.failText}</p>
        <Link href="/rooms" className="btn btn-primary">
          {t.verify.toRooms}
        </Link>
      </div>
    </main>
  );
}
