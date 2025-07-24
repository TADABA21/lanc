// Currency utilities for multi-currency support
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NGN' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'CNY' | 'INR';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
};

// Get user's preferred currency from storage or default to USD
export async function getUserCurrency(): Promise<CurrencyCode> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const savedCurrency = await AsyncStorage.getItem('userCurrency');
    return (savedCurrency as CurrencyCode) || 'USD';
  } catch {
    return 'USD';
  }
}

// Set user's preferred currency
export async function setUserCurrency(currency: CurrencyCode): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('userCurrency', currency);
  } catch (error) {
    console.error('Error saving currency preference:', error);
  }
}

// Format currency with proper locale and symbol
export function formatCurrency(
  amount: number, 
  currencyCode: CurrencyCode = 'USD',
  options: {
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const currency = CURRENCIES[currencyCode];
  const {
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  try {
    const formatter = new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits,
    });
    
    return formatter.format(amount);
  } catch (error) {
    // Fallback for unsupported locales
    const formattedNumber = amount.toLocaleString('en-US', {
      minimumFractionDigits,
      maximumFractionDigits,
    });
    
    return showSymbol ? `${currency.symbol}${formattedNumber}` : formattedNumber;
  }
}

// Convert between currencies (simplified - in production you'd use real exchange rates)
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  // Simplified conversion rates (in production, use a real API)
  const exchangeRates: Record<CurrencyCode, number> = {
    USD: 1.0,
    EUR: 0.85,
    GBP: 0.73,
    NGN: 1650.0,
    CAD: 1.35,
    AUD: 1.50,
    JPY: 150.0,
    CHF: 0.88,
    CNY: 7.25,
    INR: 83.0,
  };

  const usdAmount = amount / exchangeRates[fromCurrency];
  return usdAmount * exchangeRates[toCurrency];
}

// Get currency symbol only
export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  return CURRENCIES[currencyCode]?.symbol || '$';
}

// Get all available currencies for selection
export function getAvailableCurrencies(): Currency[] {
  return Object.values(CURRENCIES);
}