import { useState, useEffect } from 'react';
import { CurrencyCode, getUserCurrency, setUserCurrency, formatCurrency as formatCurrencyUtil } from '@/lib/currency';

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserCurrency();
  }, []);

  const loadUserCurrency = async () => {
    try {
      const userCurrency = await getUserCurrency();
      setCurrency(userCurrency);
    } catch (error) {
      console.error('Error loading user currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrency = async (newCurrency: CurrencyCode) => {
    try {
      await setUserCurrency(newCurrency);
      setCurrency(newCurrency);
    } catch (error) {
      console.error('Error updating currency:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, currency);
  };

  return {
    currency,
    loading,
    updateCurrency,
    formatCurrency,
  };
}