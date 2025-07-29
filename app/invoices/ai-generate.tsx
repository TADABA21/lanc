import React from 'react';
import { useRouter } from 'expo-router';

export default function AIInvoiceGeneratorScreen() {
  const router = useRouter();

  // Redirect to regular invoice creation with AI features
  React.useEffect(() => {
    router.replace('/invoices/new');
  }, []);

  return null;
}