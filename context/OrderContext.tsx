'use client';

import type { Locale } from '@/types/i18n';
import React, { createContext, useContext, useState } from 'react';

export type Offer = {
  id: string;
  title: string;
  price: number;
  badge: string;
  description: string;
  image: string;
};

type OrderContextType = {
  isOpen: boolean;
  selectedOffer: Offer | null;
  modalLocale: Locale | null;
  openModal: (offer?: Offer, locale?: Locale) => void;
  closeModal: () => void;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const [modalLocale, setModalLocale] = useState<Locale | null>(null);

  const openModal = (offer?: Offer, locale?: Locale) => {
    setSelectedOffer(offer ?? null);
    setModalLocale(locale ?? null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalLocale(null);
    setSelectedOffer(null);
  };

  return (
    <OrderContext.Provider value={{ isOpen, selectedOffer, modalLocale, openModal, closeModal }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};