import { useVisualViewportSize } from "@/client/hooks/useVisualViewportSize";
import { useLayoutEffect } from "react";

export function VisualViewportCssVariables() {
  const visualViewport = useVisualViewportSize();

  useLayoutEffect(() => {
    const { style } = document.documentElement;
    if (visualViewport == null) {
      style.setProperty(`--vvh`, null);
      style.setProperty(`--vvw`, null);
    } else {
      style.setProperty(`--vvh`, `${visualViewport.height}px`);
      style.setProperty(`--vvw`, `${visualViewport.width}px`);
    }
  }, [visualViewport]);

  return null;
}
