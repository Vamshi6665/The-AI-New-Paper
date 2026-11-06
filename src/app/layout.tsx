import type { Metadata } from 'next';
import { publicEnv } from '@/lib/env';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'The Daily Edition — your day, engineered into a paper',
  description:
    'Tell it your day in plain words. A high-performance engine builds your personal edition in seconds — read it, print it, own the morning.',
  openGraph: {
    title: 'The Daily Edition',
    description: 'Your day, engineered into a paper.',
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
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz@0,6..72;1,6..72&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
