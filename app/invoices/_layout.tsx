import { Stack } from 'expo-router';

export default function InvoicesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" />
      <Stack.Screen name="ai-generate" />
      <Stack.Screen name="saved" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="view/[id]" />
    </Stack>
  );
}