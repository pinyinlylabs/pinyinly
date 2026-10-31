import { colorSchemeOverrideSetting } from "@/client/theme";
import { useDeviceStoreSuspenseQuery } from "@/client/ui/hooks/useDeviceStore";
import { useColorScheme } from "react-native";

export function useColorSchemeOverride() {
  const query = useDeviceStoreSuspenseQuery(colorSchemeOverrideSetting);
  const systemTheme = useColorScheme();
  const override = query.data?.mode ?? null;
  const colorScheme = override ?? (systemTheme === `dark` ? `dark` : `light`);

  return { override, colorScheme };
}
