import { Stack } from "expo-router";

export default function LearnLayout() {
  // Even though this looks like an no-op layout—it's not, and it ensures the
  // top and bottom of the app have the correct color.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="radicals" />
    </Stack>
  );
}
