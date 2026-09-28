/**
 * app/layout.tsx — Root layout.
 * Adds: ThemeProvider (next-themes), skip-to-content link,
 * Google Fonts via next/font (Inter + JetBrains Mono), metadata.
 */

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'InterviewIQ — AI-Powered Interview Coaching',
    template: '%s | InterviewIQ',
  },
  description:
    'Master your interviews with multimodal AI analysis. Get real-time feedback on speech, body language, and STAR answer structure.',
  keywords: [
    'interview coaching',
    'AI interview',
    'speech analysis',
    'body language',
    'STAR method',
    'job interview',
    'coding challenge',
  ],
  authors: [{ name: 'InterviewIQ' }],
  robots: 'index, follow',
  openGraph: {
    title: 'InterviewIQ — AI-Powered Interview Coaching',
    description:
      'Real-time cross-modal analysis: speech pacing, facial eye contact, and STAR answer structure — simultaneously.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)',  color: '#07090f' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans bg-surface-0 text-primary-color antialiased">
        {/* Accessibility: skip to main content */}
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>

        {/* next-themes — manages .dark class on <html>, persists to localStorage */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="interviewiq-theme"
          disableTransitionOnChange={false}
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
