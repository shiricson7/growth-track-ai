import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GrowthTrack AI',
  description: 'Comprehensive Pediatric Endocrinology Dashboard with AI Analysis, Growth Tracking, and Lab OCR.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
