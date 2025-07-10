import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

export const Delay = ({
  children,
  ms,
  action,
}: PropsWithChildren<{ ms: number; action?: () => void }>) => {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setElapsed(true);
      action?.();
    }, ms);
    return () => {
      clearTimeout(timer);
    };
  }, [action, ms]);

  return elapsed ? children : null;
};
