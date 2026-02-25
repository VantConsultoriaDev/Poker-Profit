"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CurrencyContextType {
  usdToBrlRate: number;
  setUsdToBrlRate: (rate: number) => void;
  convertToBrl: (amount: number, currency: string) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializa com o valor do localStorage ou 5.50
  const [usdToBrlRate, setUsdToBrlRate] = useState<number>(() => {
    const saved = localStorage.getItem('usd_to_brl_rate');
    return saved ? parseFloat(saved) : 5.50;
  });

  const handleSetRate = (rate: number) => {
    setUsdToBrlRate(rate);
    localStorage.setItem('usd_to_brl_rate', rate.toString());
  };

  const convertToBrl = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return amount * usdToBrlRate;
    }
    return amount;
  };

  return (
    <CurrencyContext.Provider value={{ usdToBrlRate, setUsdToBrlRate: handleSetRate, convertToBrl }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};