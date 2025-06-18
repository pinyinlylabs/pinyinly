import type { PropsOf } from "@/client/ui/types";
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: `index`,
};

const modalScreenOptions = {
  animation: `slide_from_bottom`,
  presentation: `fullScreenModal`,
} satisfies PropsOf<typeof Stack.Screen>[`options`];

export default function LearnLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="reviews" options={modalScreenOptions} />
    </Stack>
  );
}
