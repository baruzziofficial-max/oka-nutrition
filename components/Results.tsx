'use client';

import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';

export default function Results() {
  const { dict, locale } = useLocale();
  const suffix = locale === 'ar' ? '-ar' : '';

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-blue-dark">
            {dict.results.heading}
          </h2>
          <div className="divider-blue mt-4" />
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="relative max-w-sm mx-auto md:max-w-none">
            <div className="relative w-full aspect-[806/652] rounded-[1.75rem] overflow-hidden shadow-2xl">
              <Image
                src={`/images/results-2${suffix}.jpg`}
                alt={dict.results.heading}
                fill
                sizes="(max-width: 767px) 384px, 50vw"
                className="object-cover"
              />

              <div className={`absolute top-4 ${locale === 'ar' ? 'end-4' : 'start-4'} bg-blue-dark/85 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-wide`}>
                {dict.results.before}
              </div>
              <div className={`absolute top-4 ${locale === 'ar' ? 'start-4' : 'end-4'} bg-blue-bright/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-wide`}>
                {dict.results.after}
              </div>

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent pt-10 pb-3 px-4">
                <p className="text-white text-sm font-medium text-center">
                  {dict.results.caption}
                </p>
              </div>
            </div>

            <div className="absolute -bottom-5 end-4 md:-end-6 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
              <p className="font-heading text-2xl font-bold text-blue-bright leading-none">95%</p>
              <p className="text-[11px] text-gray-500 mt-1">{dict.results.efficacyLabel}</p>
            </div>

            <div className="mt-10 md:mt-8 bg-blue-light rounded-2xl px-5 py-5 text-center md:text-start">
              <span className="font-heading text-4xl text-blue-bright/30 leading-none">&ldquo;</span>
              <p className="-mt-3 text-gray-700 italic text-sm sm:text-base">
                {dict.results.testimonial.text}
              </p>
              <p className="mt-3 font-bold text-blue-dark text-sm flex items-center justify-center md:justify-start gap-2">
                {dict.results.testimonial.name}
                <span className="text-yellow-400 text-xs">★★★★★</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-0">
            {dict.results.stats.map((stat) => (
              <div key={stat.label} className="card-premium text-center">
                <p className="font-heading text-3xl sm:text-4xl font-bold text-blue-bright">{stat.value}</p>
                <p className="mt-2 text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
