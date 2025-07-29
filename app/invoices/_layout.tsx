import { Stack } from 'expo-router';
import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function InvoicesLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="new" />
        <Stack.Screen name="ai-generate" />
        <Stack.Screen name="edit/[id]" />
        <Stack.Screen name="view/[id]" />
      </Stack>
    </ThemeProvider>
  );
}