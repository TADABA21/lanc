interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface AppSettings {
  taxRate: number;
  currency: string;
  currencySymbol: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
}