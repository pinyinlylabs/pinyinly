import { useEffect, useState } from "react";
import type { PropsWithChildren, ReactNode } from "react";

export const Delay = ({
  children,
  ms,
  action,
}: PropsWithChildren<{ ms: number; action?: () => void }>): ReactNode => {
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
