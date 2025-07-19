import { Stack } from 'expo-router';

export default function TestimonialsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="request" />
      <Stack.Screen name="view/[id]" />
      <Stack.Screen name="public/[userId]" />
    </Stack>
  );
}