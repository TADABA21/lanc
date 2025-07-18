import { Stack } from 'expo-router';

export default function ClientsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="view/[id]" />
    </Stack>
  );
}