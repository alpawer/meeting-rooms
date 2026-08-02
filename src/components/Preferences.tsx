'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, messages, type Locale } from '@/lib/messages';
import { LOCALE_STORAGE_KEY, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';

interface Preferences {
  /** False during the server render and the first client render. */
  ready: boolean;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: ReturnType<typeof messages>;
}

const PreferencesContext = createContext<Preferences | null>(null);

/**
 * Reads what the bootstrap script already put on <html>.
 * Runs during the first render, not in an effect, otherwise every navigation
 * would briefly show the defaults before the stored choice was restored.
 */
function initialLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const lang = document.documentElement.lang;
  return (LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : DEFAULT_LOCALE;
}

function initialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Theme and locale only exist in the browser, so anything that depends on
  // them renders after mount. Rendering it on the server would produce markup
  // the client disagrees with, and React would throw the whole tree away.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setLocaleState(initialLocale());
    setTheme(initialTheme());
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_STORAGE_KEY, next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  return (
    <PreferencesContext.Provider
      value={{ ready, locale, setLocale, theme, toggleTheme, t: messages(locale) }}
    >
      {/* Children are not rendered at all until the stored locale and theme
          are known. Hiding them was not enough: React still compared the
          server text with the client text and discarded the tree. */}
      {ready ? children : null}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
