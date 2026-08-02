export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'theme';
export const LOCALE_STORAGE_KEY = 'locale';

/**
 * Runs before the first paint, inline in <head>.
 *
 * Both preferences are applied to <html> here rather than in an effect.
 * Reading them after the first render made the default theme and locale
 * flash on every navigation before the stored choice kicked in.
 */
export const PREFERENCES_BOOTSTRAP = `
(function () {
  var root = document.documentElement;
  try {
    var storedTheme = localStorage.getItem('${THEME_STORAGE_KEY}');
    root.setAttribute('data-theme',
      storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    var storedLocale = localStorage.getItem('${LOCALE_STORAGE_KEY}');
    if (storedLocale === 'uk' || storedLocale === 'en') root.lang = storedLocale;
  } catch (e) {
    root.setAttribute('data-theme', 'light');
  }
})();
`;
