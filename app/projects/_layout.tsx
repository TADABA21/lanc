import { Stack } from 'expo-router';
import React from 'react';

export default function ProjectsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="view/[id]" />
    </Stack>
  );
}