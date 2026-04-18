import { createContext, useContext, useState, useMemo } from 'react';

// Exchange rates (base: KRW)
const RATES = {
  KRW: 1,
  JPY: 0.112,    // 1 KRW ≈ 0.112 JPY
  USD: 0.00072,  // 1 KRW ≈ 0.00072 USD
  EUR: 0.00066,  // 1 KRW ≈ 0.00066 EUR
};

// Reverse: how many KRW per 1 unit of target
const TO_KRW = {
  KRW: 1,
  JPY: 8.93,     // 1 JPY ≈ 8.93 KRW
  USD: 1389,     // 1 USD ≈ 1389 KRW
  EUR: 1515,     // 1 EUR ≈ 1515 KRW
};

const SYMBOLS = {
  KRW: '₩',
  JPY: '¥',
  USD: '$',
  EUR: '€',
};

const CURRENCY_NAMES = {
  KRW: { ko: '원 (KRW)', en: 'Korean Won', ja: '韓国ウォン', zh: '韩元' },
  JPY: { ko: '엔 (JPY)', en: 'Japanese Yen', ja: '日本円', zh: '日元' },
  USD: { ko: '달러 (USD)', en: 'US Dollar', ja: '米ドル', zh: '美元' },
  EUR: { ko: '유로 (EUR)', en: 'Euro', ja: 'ユーロ', zh: '欧元' },
};

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    try { return localStorage.getItem('phosnap_currency') || 'KRW'; } catch { return 'KRW'; }
  });

  const changeCurrency = (c) => {
    setCurrency(c);
    try { localStorage.setItem('phosnap_currency', c); } catch {}
  };

  // Convert from source currency to display currency
  const convert = (amount, fromCurrency = 'KRW') => {
    if (!amount || amount === 0) return 0;
    // First convert to KRW
    const inKRW = fromCurrency === 'KRW' ? amount : amount * TO_KRW[fromCurrency];
    // Then convert to target
    if (currency === 'KRW') return Math.round(inKRW);
    return Math.round(inKRW * RATES[currency] * 100) / 100;
  };

  // Format with symbol
  const formatPrice = (amount, fromCurrency = 'KRW') => {
    const converted = convert(amount, fromCurrency);
    const symbol = SYMBOLS[currency] || '₩';
    if (currency === 'KRW' || currency === 'JPY') {
      return `${symbol}${converted.toLocaleString()}`;
    }
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const value = useMemo(() => ({
    currency,
    setCurrency: changeCurrency,
    convert,
    formatPrice,
    symbol: SYMBOLS[currency],
    currencies: Object.keys(RATES),
    currencyNames: CURRENCY_NAMES,
    SYMBOLS,
    RATES,
    TO_KRW,
  }), [currency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);
export { SYMBOLS, RATES, TO_KRW, CURRENCY_NAMES };
