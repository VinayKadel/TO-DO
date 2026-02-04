// Root layout for the Next.js app
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { PWAWrapper } from '@/components/providers/pwa-wrapper';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'HabitTrack - Daily Habit Tracker',
  description: 'Track your daily habits and build consistency with HabitTrack. A simple, beautiful habit tracking app.',
  keywords: ['habit tracker', 'todo', 'productivity', 'daily habits', 'task management'],
  authors: [{ name: 'HabitTrack' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HabitTrack',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <SessionProvider>
          <ThemeProvider>
            {children}
            <PWAWrapper />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
