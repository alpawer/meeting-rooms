'use client';

import { usePreferences } from '@/components/Preferences';

/** Tells an unverified user why booking is unavailable. */
export function VerifyBanner() {
  const { t, ready } = usePreferences();
  if (!ready) return null;

  return (
    <div className="verify-banner" role="status">
      {t.verify.banner}
    </div>
  );
}
