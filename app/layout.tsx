import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Inter, Playfair_Display, Cairo } from 'next/font/google';
import './globals.css';
import { OrderProvider } from '@/context/OrderContext';
import HtmlAttributes from '@/components/HtmlAttributes';
import TikTokPixel from '@/components/TikTokPixel';
import MetaPixel from '@/components/MetaPixel';

const inter = Inter({ subsets: ['latin'] });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  preload: false,
});

const seoTitle = 'Öka Nutrition | DHT Control – Complément cheveux homme au Maroc';
const seoDescription =
  'Öka Nutrition DHT Control est un complément alimentaire pour hommes avec Saw Palmetto, L-Méthionine, L-Cystéine, zinc, sélénium et vitamine D3. Livraison gratuite au Maroc.';

export const metadata: Metadata = {
  metadataBase: new URL('https://okanutrition.com'),
  title: {
    default: seoTitle,
    template: '%s | Öka Nutrition',
  },
  description: seoDescription,
  applicationName: 'Öka Nutrition',
  category: 'health',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  alternates: {
    canonical: '/',
    languages: {
      fr: '/',
      ar: '/ar',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Öka Nutrition',
    locale: 'fr_MA',
    alternateLocale: ['ar_MA'],
    title: seoTitle,
    description: seoDescription,
    images: [
      {
        url: '/images/product-main.jpg',
        alt: 'Öka Nutrition DHT Control',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: seoTitle,
    description: seoDescription,
    images: ['/images/product-main.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className={`${inter.className} ${playfair.variable} ${cairo.variable}`}>
        <TikTokPixel />
        <MetaPixel />
        <HtmlAttributes />
        <OrderProvider>{children}</OrderProvider>
        <Analytics />
      </body>
    </html>
  );
}
