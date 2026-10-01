'use client';

import { useOrder } from '@/context/OrderContext';
import { useLocale } from '@/context/LocaleContext';

export default function MobileOrderBar() {
  const { isOpen, openModal } = useOrder();
  const { dict, locale } = useLocale();
  const arabic = locale === 'ar';
  if (isOpen) return null;

  return (
    <>
      <div className="h-[calc(7rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-bright/20 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg lg:hidden" dir={arabic ? 'rtl' : 'ltr'}>
        <p className="mb-2 text-center text-xs font-semibold text-blue-dark">
          {arabic ? '3 أشهر • توصيل مجاني • الدفع عند الاستلام' : 'Cure 3 mois • Livraison gratuite • Paiement à réception'}
        </p>
        <button type="button" className="btn-primary w-full min-h-12 py-3" onClick={() => openModal({
          id: 'offre-2', title: dict.hero.packs.offre2.title, price: 349,
          badge: dict.hero.packs.offre2.badge, description: dict.hero.packs.offre2.description,
          image: `/images/offre-2${arabic ? '-ar' : ''}.jpg`,
        })}>
          {arabic ? 'اطلب الآن — 349 درهم' : 'Commander — 349 DH'}
        </button>
      </div>
    </>
  );
}
