// Root layout for the Next.js app
import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { SessionProvider } from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { PWAWrapper } from '@/components/providers/pwa-wrapper';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-brand' });

export const metadata: Metadata = {
  title: 'SONITRACK - Your Productivity Companion',
  description: 'Track your daily habits, to-dos, and notes with SONITRACK. A sleek, powerful productivity app.',
  keywords: ['habit tracker', 'todo', 'productivity', 'daily habits', 'task management', 'notes'],
  authors: [{ name: 'SONITRACK' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SONITRACK',
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
    <html lang="en" className={`${inter.className} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
