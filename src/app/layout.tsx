import type { Metadata } from 'next';
import './globals.css';
import { getSessionUser } from '@/lib/session';
import { Header } from '@/components/Header';
import { PreferencesProvider } from '@/components/Preferences';
import { PREFERENCES_BOOTSTRAP } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Meeting rooms',
  description: 'Book meeting rooms in the office',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        {/* Applies theme and locale before the first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_BOOTSTRAP }} />
      </head>
      <body>
        <PreferencesProvider>
          <div className="shell">
            <Header user={user} />
            {children}
          </div>
        </PreferencesProvider>
      </body>
    </html>
  );
}
