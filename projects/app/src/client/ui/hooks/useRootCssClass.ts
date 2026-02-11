import { useLayoutEffect } from "react";

/**
 * Add a CSS class to the root element of the document.
 */
export function useRootCssClass(className: string) {
  useLayoutEffect(() => {
    const html = globalThis.document.documentElement;
    html.classList.add(className);
    return () => {
      html.classList.remove(className);
    };
  }, [className]);
}
