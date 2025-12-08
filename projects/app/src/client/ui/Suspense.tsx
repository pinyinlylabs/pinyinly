import type { PropsOf } from "@pinyinly/lib/types";
import { Suspense as ReactSuspense, useEffect, useRef } from "react";

const intervalMs = 5000;

function PylyDevSuspense({
  children,
  ...props
}: PropsOf<typeof ReactSuspense>) {
  const renderCount = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      renderCount.current = 0;
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <ReactSuspense {...props}>
      {/* Must be the first child so that it re-renders any time a promise is thrown.  */}
      <RenderCounter counter={renderCount} />
      {children}
    </ReactSuspense>
  );
}

function RenderCounter({ counter }: { counter: React.RefObject<number> }) {
  counter.current += 1;
  if (counter.current > 25) {
    throw new Error(
      `<Suspense> children re-rendered ${counter.current} times in the last ${intervalMs} milliseconds`,
    );
  }

  return null;
}

export const Suspense = __DEV__ ? PylyDevSuspense : ReactSuspense;
