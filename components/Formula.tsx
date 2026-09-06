'use client';

import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';

export default function Formula() {
  const { dict, locale } = useLocale();
  const suffix = locale === 'ar' ? '-ar' : '';

  return (
    <section id="formule" className="pt-3 pb-16 md:py-24 bg-blue-light">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
        {/* Heading — shown above the video on mobile only; grouped with body text on desktop */}
        <div className="text-center order-1 md:hidden">
          <h2 className="font-heading text-3xl font-bold text-blue-dark leading-tight relative inline-block">
            {dict.formula.heading}
            <span className="block h-1 w-16 bg-blue-bright/40 rounded-full mx-auto mt-2" />
          </h2>
          <p className="mt-4 text-base font-semibold text-blue-dark px-4">
            {dict.formula.mobileSubtitle}
          </p>
        </div>

        {/* Video slot */}
        <div className="flex-1 w-full flex justify-center order-2 md:order-1">
          <div className="relative w-full max-w-[280px] md:max-w-[320px] aspect-[9/16] rounded-[2rem] overflow-hidden shadow-xl bg-white border border-blue-bright/15">
            <video
              src="/videos/formula-demo.mp4"
              poster={`/images/formula-video-poster${suffix}.jpg`}
              preload="none"
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Body text — on desktop this includes the heading (hidden mobile copy above handles small screens) */}
        <div className="flex-1 text-center md:text-start order-3 md:order-2">
          <h2 className="hidden md:block font-heading text-3xl md:text-4xl font-bold text-blue-dark">
            {dict.formula.heading}
          </h2>
          <div className="hidden md:block divider-blue mt-4 mx-auto md:mx-0" />

          <div className="mt-6 md:mt-6 border border-blue-bright/30 rounded-xl px-5 py-4">
            <p className="text-xl font-semibold text-blue-dark">
              {dict.formula.lead}
            </p>
            <p className="mt-3 text-lg text-gray-700">
              {dict.formula.body}
            </p>
          </div>
        </div>

        <div className="flex-1 w-full flex justify-center order-4 md:order-3">
          <div className="relative w-full max-w-[380px] md:max-w-[440px] aspect-[1149/1369] rounded-[2rem] overflow-hidden shadow-xl bg-white">
            <Image
              src={`/images/formula${suffix}.jpg`}
              alt={dict.formula.heading}
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
