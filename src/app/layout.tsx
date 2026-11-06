import type { Metadata } from 'next';
import { publicEnv } from '@/lib/env';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'The Daily Edition — your day, set in type on one page',
  description:
    'Tell it your day in plain words. Speak or type your day and get a detailed, printable one-page personal newspaper — read it, print it, own the morning.',
  openGraph: {
    title: 'The Daily Edition',
    description: 'Your day, set in type on one page.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  void publicEnv;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,700;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&family=Oswald:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
