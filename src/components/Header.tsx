'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { usePreferences } from '@/components/Preferences';
import { LOCALES } from '@/lib/messages';
import type { SessionUser } from '@/lib/session';

export function Header({ user }: { user: SessionUser | null }) {
  const { ready, t, locale, setLocale, theme, toggleTheme } = usePreferences();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  // Until preferences are read from the browser the header would render with
  // the wrong language and theme icon, so it holds an empty bar of the same
  // height instead of shifting the layout when it appears.
  if (!ready) return <header className="topbar topbar-placeholder" aria-hidden="true" />;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={user ? '/rooms' : '/login'} className="wordmark">
          {t.ui.appName}
        </Link>

        <nav className="nav">
          {user ? (
            <>
              <Link href="/rooms">{t.ui.rooms}</Link>
              <Link href="/my?scope=upcoming">{t.ui.myBookings}</Link>
            </>
          ) : (
            <>
              <Link href="/login">{t.ui.signIn}</Link>
              <Link href="/register">{t.ui.signUp}</Link>
            </>
          )}

          <span className="segmented" role="group" aria-label={t.ui.language}>
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                className="segment"
                aria-pressed={locale === code}
                onClick={() => setLocale(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </span>

          <button
            type="button"
            className="btn btn-ghost btn-sm icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.ui.themeToLight : t.ui.themeToDark}
            title={theme === 'dark' ? t.ui.themeToLight : t.ui.themeToDark}
          >
            {theme === 'dark' ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {user && (
            <>
              <span className="who">{user.name}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={signOut} disabled={signingOut}>
                {signingOut ? t.ui.signingOut : t.ui.signOut}
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
