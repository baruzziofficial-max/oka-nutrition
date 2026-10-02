'use client';

import { useOrder } from '@/context/OrderContext';
import { useLocale } from '@/context/LocaleContext';

export default function MobileOrderBar() {
  const { isOpen, openModal } = useOrder();
  const { locale } = useLocale();
  const arabic = locale === 'ar';
  if (isOpen) return null;

  return (
    <>
      <div className="h-[calc(10rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-bright/20 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg lg:hidden" dir={arabic ? 'rtl' : 'ltr'}>
        <p className="mb-2 text-center text-xs font-semibold text-blue-dark">
          {arabic ? 'توصيل مجاني • الدفع عند الاستلام' : 'Livraison gratuite • Paiement à réception'}
        </p>
        <button type="button" className="btn-primary w-full min-h-12 py-3" onClick={() => openModal()}>
          {arabic ? 'اختر العرض المناسب لك' : 'Choisir ma cure'}
        </button>
        {!arabic && (
          <button
            type="button"
            lang="ar"
            dir="rtl"
            className="mt-1 min-h-11 w-full text-center text-sm font-semibold text-blue-dark underline underline-offset-4"
            onClick={() => openModal(undefined, 'ar')}
          >
            اختر العرض المناسب لك
          </button>
        )}
      </div>
    </>
  );
}
