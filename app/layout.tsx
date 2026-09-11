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

export const metadata: Metadata = {
  title: 'OKA Nutrition – Solution naturelle contre la chute de cheveux',
  description: 'Découvrez OKA Nutrition, le complément alimentaire 100% naturel pour retrouver une chevelure forte et en pleine santé. Livraison gratuite au Maroc.',
  metadataBase: new URL('https://okanutrition.com'),
  alternates: {
    canonical: '/',
    languages: {
      fr: '/',
      ar: '/ar',
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
