'use client';

import dynamic from 'next/dynamic';
import PromoBar from '@/components/PromoBar';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import WhatsAppButton from '@/components/WhatsAppButton';

const Benefits = dynamic(() => import('@/components/Benefits'));
const Formula = dynamic(() => import('@/components/Formula'));
const Results = dynamic(() => import('@/components/Results'));
const Reviews = dynamic(() => import('@/components/Reviews'));
const FAQ = dynamic(() => import('@/components/FAQ'));
const FinalCTA = dynamic(() => import('@/components/FinalCTA'));
const Footer = dynamic(() => import('@/components/Footer'));
const OrderModal = dynamic(() => import('@/components/OrderModal'), { ssr: false });

export default function HomePage() {
  return (
    <>
      <PromoBar />
      <Header />
      <main className="flex flex-col">
        <div className="order-1">
          <Hero />
        </div>
        <div className="order-2 lg:order-3">
          <Benefits />
        </div>
        <div className="order-4">
          <Formula />
        </div>
        <div className="order-6">
          <Results />
        </div>
        <div className="order-7">
          <Reviews />
        </div>
        <div className="order-8">
          <FAQ />
        </div>
        <div className="order-9">
          <FinalCTA />
        </div>
      </main>
      <Footer />
      <OrderModal />
      <WhatsAppButton />
    </>
  );
}
