'use client';

import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';

export default function Benefits() {
  const { dict, locale } = useLocale();
  const suffix = locale === 'ar' ? '-ar' : '';

  const images = [
    `/images/icon-benefit-1${suffix}.jpg`,
    `/images/icon-benefit-2${suffix}.jpg`,
    `/images/icon-benefit-3${suffix}.jpg`,
  ];

  return (
    <section className="bg-white py-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-blue-dark">
            {dict.benefits.heading}
          </h2>
          <div className="divider-blue mt-4" />
        </div>

        <div className="flex sm:grid sm:grid-cols-3 gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-auto sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {dict.benefits.items.map((b, idx) => (
            <div
              key={b.label}
              className="card-premium text-center flex flex-col items-center shrink-0 w-[85%] sm:w-auto snap-center"
            >
              <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                <Image
                  src={images[idx]}
                  alt={b.label}
                  fill
                  sizes="(max-width: 639px) 85vw, 33vw"
                  className="object-cover"
                />
              </div>
              <h3 className="mt-4 font-bold text-blue-dark">{b.label}</h3>
              <p className="mt-2 text-sm text-gray-600">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex sm:hidden items-center justify-center gap-1.5 mt-4">
          {dict.benefits.items.map((b) => (
            <span key={b.label} className="w-1.5 h-1.5 rounded-full bg-blue-bright/30" />
          ))}
        </div>
      </div>
    </section>
  );
}
