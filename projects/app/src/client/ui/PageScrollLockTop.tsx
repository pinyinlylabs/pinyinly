import { useLayoutEffect } from "react";

export function PageScrollLockTop() {
  useLayoutEffect(() => {
    globalThis.visualViewport?.addEventListener(`scroll`, handleScroll);
    return () => {
      globalThis.visualViewport?.removeEventListener(`scroll`, handleScroll);
    };
  }, []);

  return null;
}

function handleScroll(this: VisualViewport) {
  if (this.offsetTop > 0) {
    globalThis.scrollTo({ top: 0, behavior: `instant` });
  }
}
