import { Stack } from "expo-router";

export default function LearnLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="reviews"
        options={{
          animation: `fade`,
          presentation: `fullScreenModal`,
        }}
      />
    </Stack>
  );
}
