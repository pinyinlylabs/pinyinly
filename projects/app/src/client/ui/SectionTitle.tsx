import type { ComponentProps } from "react";
import { Text } from "@/client/ui/Text";

export function SectionTitle({
  children,
}: {
  children: ComponentProps<typeof Text>[`children`];
}) {
  return <Text className="pyly-body-subheading text-fg-dim">{children}</Text>;
}
