import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function NewContractScreen() {
  const router = useRouter();

  // Redirect to AI generator by default
  React.useEffect(() => {
    router.replace('/contracts/ai-generate');
  }, []);

  return null;
}