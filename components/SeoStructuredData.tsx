type SeoStructuredDataProps = {
  locale: 'fr' | 'ar';
};

export default function SeoStructuredData({ locale }: SeoStructuredDataProps) {
  const isArabic = locale === 'ar';
  const url = isArabic ? 'https://okanutrition.com/ar' : 'https://okanutrition.com';
  const description = isArabic
    ? 'DHT Control مكمل غذائي للرجال يحتوي على Saw Palmetto وL-Methionine وL-Cysteine والزنك والسيلينيوم وفيتامين D3، مع توصيل مجاني في المغرب.'
    : 'DHT Control est un complément alimentaire pour hommes avec Saw Palmetto, L-Méthionine, L-Cystéine, zinc, sélénium et vitamine D3, avec livraison gratuite au Maroc.';

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://okanutrition.com/#organization',
        name: 'Öka Nutrition',
        url: 'https://okanutrition.com',
        logo: {
          '@type': 'ImageObject',
          url: 'https://okanutrition.com/images/logo-mark.png',
        },
      },
      {
        '@type': 'Product',
        '@id': `${url}#dht-control`,
        name: 'Öka Nutrition DHT Control',
        description,
        image: ['https://okanutrition.com/images/product-main.jpg'],
        brand: {
          '@type': 'Brand',
          name: 'Öka Nutrition',
        },
        category: isArabic ? 'مكمل غذائي للشعر' : 'Complément alimentaire pour cheveux',
        offers: [
          {
            '@type': 'Offer',
            name: isArabic ? 'علبة لمدة شهر واحد' : 'Cure 1 mois',
            url: `${url}#dht-control`,
            priceCurrency: 'MAD',
            price: '175',
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@id': 'https://okanutrition.com/#organization' },
          },
          {
            '@type': 'Offer',
            name: isArabic ? '3 علب — تكفي لمدة 3 أشهر' : 'Cure 3 mois — 2 achetés + 1 offert',
            url: `${url}#dht-control`,
            priceCurrency: 'MAD',
            price: '349',
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@id': 'https://okanutrition.com/#organization' },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
