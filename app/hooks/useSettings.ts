
import { useState } from 'react';

export interface AppSettings {
  taxRate: number;
  currency: string;
  currencySymbol: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
}

const defaultSettings: AppSettings = {
  taxRate: 0,
  currency: 'USD',
  currencySymbol: '$',
  companyName: '',
  companyAddress: '',
  companyEmail: '',
  companyPhone: '',
};

export function useSettings() {
  // In a real app, load from storage or context
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return { settings, updateSettings };
}