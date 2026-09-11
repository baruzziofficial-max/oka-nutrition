import type { Metadata } from 'next';

const seoTitle = 'DHT Control – مكمل غذائي للشعر للرجال في المغرب | Öka Nutrition';
const seoDescription =
  'DHT Control مكمل غذائي للرجال يحتوي على Saw Palmetto وL-Methionine وL-Cysteine والزنك والسيلينيوم وفيتامين D3. توصيل مجاني في المغرب.';

export const metadata: Metadata = {
  title: {
    absolute: seoTitle,
  },
  description: seoDescription,
  alternates: {
    canonical: '/ar',
    languages: {
      fr: '/',
      ar: '/ar',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    url: '/ar',
    siteName: 'Öka Nutrition',
    locale: 'ar_MA',
    alternateLocale: ['fr_MA'],
    title: seoTitle,
    description: seoDescription,
    images: [
      {
        url: '/images/product-main-ar.jpg',
        alt: 'Öka Nutrition DHT Control',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: seoTitle,
    description: seoDescription,
    images: ['/images/product-main-ar.jpg'],
  },
};

export default function ArLayout({ children }: { children: React.ReactNode }) {
  return children;
}
