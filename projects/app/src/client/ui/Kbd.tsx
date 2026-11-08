import type { ComponentProps } from "react";
import { Text } from "@/client/ui/Text";

export function Kbd({
  children,
}: {
  children: ComponentProps<typeof Text>[`children`];
}) {
  return (
    <Text
      className="
        rounded-md border border-fg/15 bg-bg-high px-1.5 py-0.5 font-mono text-sm text-muted-fg
      "
    >
      {children}
    </Text>
  );
}
