'use client';

import { useOrder } from '@/context/OrderContext';
import { useLocale } from '@/context/LocaleContext';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

type Offer = {
  id: string;
  title: string;
  price: number;
  badge: string;
  description: string;
  image: string;
};

type FormData = {
  name: string;
  phone: string;
  city: string;
};

function trackMeta(eventName: string, params: Record<string, unknown>, eventId?: string) {
  if (typeof window === 'undefined' || !(window as any).fbq) return;

  if (eventId) {
    (window as any).fbq('track', eventName, params, { eventID: eventId });
    return;
  }

  (window as any).fbq('track', eventName, params);
}

export default function OrderModal() {
  const { isOpen, selectedOffer, closeModal } = useOrder();
  const { dict, locale } = useLocale();
  const suffix = locale === 'ar' ? '-ar' : '';
  const [step, setStep] = useState<'offers' | 'form' | 'success'>('offers');
  const [chosenOffer, setChosenOffer] = useState<Offer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const trackedCheckoutOfferRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && selectedOffer) {
      setChosenOffer(selectedOffer);
      setStep('form');
      setSubmitError('');

      if (trackedCheckoutOfferRef.current !== selectedOffer.id) {
        const quantity = selectedOffer.id === 'offre-2' ? 3 : 1;
        trackMeta('InitiateCheckout', {
          content_name: selectedOffer.title,
          content_ids: [selectedOffer.id],
          content_type: 'product',
          num_items: quantity,
          value: selectedOffer.price,
          currency: 'MAD',
        });
        trackedCheckoutOfferRef.current = selectedOffer.id;
      }
    }
  }, [isOpen, selectedOffer]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    city: '',
  });

  const offers: Offer[] = [
    {
      id: 'offre-1',
      title: dict.orderModal.offre1.title,
      price: 175,
      badge: dict.orderModal.offre1.badge,
      description: dict.orderModal.offre1.description,
      image: `/images/offre-1${suffix}.jpg`,
    },
    {
      id: 'offre-2',
      title: dict.orderModal.offre2.title,
      price: 349,
      badge: dict.orderModal.offre2.badge,
      description: dict.orderModal.offre2.description,
      image: `/images/offre-2${suffix}.jpg`,
    },
  ];

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('offers');
    setChosenOffer(null);
    setFormData({ name: '', phone: '', city: '' });
    setIsSubmitting(false);
    setSubmitError('');
    trackedCheckoutOfferRef.current = null;
    closeModal();
  };

  const handleSelectOffer = (offer: Offer) => {
    setChosenOffer(offer);
    setStep('form');
    setSubmitError('');

    if (trackedCheckoutOfferRef.current !== offer.id) {
      const quantity = offer.id === 'offre-2' ? 3 : 1;
      trackMeta('InitiateCheckout', {
        content_name: offer.title,
        content_ids: [offer.id],
        content_type: 'product',
        num_items: quantity,
        value: offer.price,
        currency: 'MAD',
      });
      trackedCheckoutOfferRef.current = offer.id;
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid =
    formData.name.trim() &&
    formData.phone.trim() &&
    formData.city.trim();

  const quantityFor = (offer: Offer) => (offer.id === 'offre-2' ? 3 : 1);

  const handleSubmit = async () => {
    if (!chosenOffer || !isFormValid || isSubmitting) return;

    const quantity = quantityFor(chosenOffer);
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          city: formData.city,
          offerTitle: chosenOffer.title,
          offerDescription: chosenOffer.description,
          quantity,
          totalAmount: chosenOffer.price,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'Order could not be saved');
      }

      const orderId = result.orderId ? String(result.orderId) : '';
      const leadEventId = orderId ? `oka_lead_${orderId}` : undefined;

      trackMeta(
        'Lead',
        {
          content_name: chosenOffer.title,
          content_ids: [chosenOffer.id],
          content_type: 'product',
          num_items: quantity,
          value: chosenOffer.price,
          currency: 'MAD',
        },
        leadEventId
      );

      if (typeof window !== 'undefined' && (window as any).ttq) {
        (window as any).ttq.track('SubmitForm', {
          content_id: chosenOffer.id,
          content_name: chosenOffer.title,
          quantity,
          value: chosenOffer.price,
          currency: 'MAD',
        });
      }

      setStep('success');
    } catch (error) {
      console.error('Failed to save order:', error);
      setSubmitError(
        locale === 'ar'
          ? 'تعذر تسجيل الطلب. المرجو المحاولة مرة أخرى.'
          : "Impossible d’enregistrer la commande. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsappContact = () => {
    if (!chosenOffer) return;
    const quantity = quantityFor(chosenOffer);
    const message = dict.orderModal.whatsappMessage(
      quantity,
      chosenOffer.price,
      formData.name,
      formData.phone,
      formData.city,
      ''
    );
    const url = `https://wa.me/212663822682?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const reassurance =
    locale === 'ar'
      ? 'الدفع عند الاستلام • التوصيل مجاني • تأكيد سريع للطلب'
      : 'Paiement à la livraison • Livraison gratuite • Confirmation rapide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-dark">
            {step === 'offers'
              ? dict.orderModal.chooseOffer
              : step === 'form'
              ? dict.orderModal.deliveryInfo
              : dict.orderModal.orderReceivedTitle}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {step === 'offers' && (
          <div className="space-y-6">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl border-2 transition-all ${
                  selectedOffer?.id === offer.id
                    ? 'border-blue-bright bg-blue-light'
                    : 'border-gray-100 hover:border-blue-bright/50'
                }`}
              >
                <div className="relative w-32 h-32 flex-shrink-0">
                  <Image src={offer.image} alt={offer.title} fill className="object-contain" />
                </div>
                <div className="flex-1 text-center sm:text-start">
                  <span className="inline-block bg-blue-bright text-white text-xs font-bold px-3 py-1 rounded-full mb-1">
                    {offer.badge}
                  </span>
                  <h3 className="text-xl font-bold text-blue-dark">{offer.title}</h3>
                  <p className="text-gray-600">{offer.description}</p>
                  <p className="text-2xl font-extrabold text-blue-bright mt-1">{offer.price} DH</p>
                </div>
                <button
                  onClick={() => handleSelectOffer(offer)}
                  className="btn-primary text-sm py-2 px-6 whitespace-nowrap"
                >
                  {dict.orderModal.commander}
                </button>
              </div>
            ))}
          </div>
        )}

        {step === 'form' && chosenOffer && (
          <div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-light mb-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image src={chosenOffer.image} alt={chosenOffer.title} fill className="object-contain" />
              </div>
              <div>
                <p className="font-bold text-blue-dark">{chosenOffer.title}</p>
                <p className="text-sm text-gray-600">{chosenOffer.description}</p>
                <p className="font-extrabold text-blue-bright">{chosenOffer.price} DH</p>
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-blue-bright/20 bg-blue-light/50 px-4 py-3 text-center text-sm font-semibold text-blue-dark">
              {reassurance}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-blue-dark mb-1">
                  {dict.orderModal.fullName}
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={dict.orderModal.fullNamePlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-bright"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-blue-dark mb-1">
                  {dict.orderModal.phone}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder={dict.orderModal.phonePlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-bright"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-blue-dark mb-1">
                  {dict.orderModal.city}
                </label>
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder={dict.orderModal.cityPlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-bright"
                />
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-gray-500">
              {locale === 'ar'
                ? 'سيتم تأكيد عنوان التوصيل معك قبل الإرسال.'
                : 'Votre adresse de livraison sera confirmée avec vous avant expédition.'}
            </p>

            {submitError && (
              <p className="mt-4 text-sm text-red-600 text-center" role="alert">
                {submitError}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setStep('offers')}
                disabled={isSubmitting}
                className="btn-outline flex-1 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {dict.orderModal.back}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="btn-primary flex-1 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {dict.orderModal.confirmOrder}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <p className="text-5xl mb-4">✅</p>
            <p className="text-gray-700">{dict.orderModal.orderReceivedMessage}</p>
            <p className="mt-3 text-sm font-medium text-gray-500">
              {locale === 'ar'
                ? 'سنتواصل معك لتأكيد الطلب وعنوان التوصيل قبل الإرسال.'
                : 'Nous vous contacterons pour confirmer la commande et l’adresse avant expédition.'}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={handleClose} className="btn-primary py-3 px-10">
                {dict.orderModal.close}
              </button>
              <button onClick={handleWhatsappContact} className="btn-outline py-3 px-10">
                {locale === 'ar' ? 'تواصل معنا على واتساب' : 'Nous contacter sur WhatsApp'}
              </button>
            </div>
          </div>
        )}

        {step === 'offers' && (
          <p className="mt-6 text-center text-sm text-gray-500">{dict.orderModal.selectPrompt}</p>
        )}
      </div>
    </div>
  );
}
