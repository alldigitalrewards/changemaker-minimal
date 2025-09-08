import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://changemaker.im'),
  title: {
    default: 'Changemaker - Transform Ideas into Impact',
    template: '%s | Changemaker'
  },
  description: 'Join the Changemaker Platform to participate in meaningful challenges that drive positive impact in your community. Earn rewards, build connections, and make a difference.',
  keywords: ['changemaker', 'innovation', 'challenges', 'community impact', 'social good', 'collaboration'],
  authors: [{ name: 'Changemaker Team' }],
  creator: 'Changemaker',
  publisher: 'Changemaker',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://changemaker.im',
    siteName: 'Changemaker',
    title: 'Changemaker - Transform Ideas into Impact',
    description: 'Join meaningful challenges that drive positive impact in your community.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Changemaker Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Changemaker - Transform Ideas into Impact',
    description: 'Join meaningful challenges that drive positive impact in your community.',
    images: ['/og-image.png'],
    creator: '@changemaker',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
    shortcut: '/icon',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        {/* Removed SpeedInsights - not MVP; add back if needed for production */}
      </body>
    </html>
  );
}
