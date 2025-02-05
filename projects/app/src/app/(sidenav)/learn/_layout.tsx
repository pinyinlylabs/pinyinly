import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: `index`,
};

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
