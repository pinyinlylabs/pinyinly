import type { PropsWithChildren } from "react";
import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ScopedTheme, useUniwind } from "uniwind";

export function Portal({ children }: PropsWithChildren) {
  const { theme } = useUniwind();

  const element = document.createElement(`div`);

  useLayoutEffect(() => {
    if (!element.parentElement) {
      document.body.append(element);
    }
    return () => {
      if (element.parentElement) {
        element.remove();
      }
    };
  }, [element]);

  return createPortal(
    <ScopedTheme theme={theme}>{children}</ScopedTheme>,
    element,
  );
}
