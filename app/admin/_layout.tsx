import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="contact-submissions" />
      <Stack.Screen name="feedback-submissions" />
    </Stack>
  );
}