import type { PropsWithChildren } from "react";
import { createContext, useEffect, useRef, useState } from "react";

export interface TooltipProviderProps {
  children?: PropsWithChildren[`children`];
  delayDuration?: number;
  skipDelayDuration?: number;
}

export interface TooltipProviderContextValue {
  getOpenDelayDuration: () => number;
  onTooltipOpen: () => void;
  onTooltipClose: () => void;
}

const defaultDelayDuration = 500;
const defaultSkipDelayDuration = 1000;

const TooltipProviderContext =
  createContext<TooltipProviderContextValue | null>(null);

export const TooltipProvider = Object.assign(
  function TooltipProvider({
    children,
    delayDuration = defaultDelayDuration,
    skipDelayDuration = defaultSkipDelayDuration,
  }: TooltipProviderProps) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.
    const [isImmediateMode, setIsImmediateMode] = useState(false);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearResetTimer = () => {
      if (resetTimerRef.current != null) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };

    useEffect(() => {
      return () => {
        clearResetTimer();
      };
    }, []);

    const contextValue: TooltipProviderContextValue = {
      getOpenDelayDuration: () => {
        return isImmediateMode ? 0 : delayDuration;
      },
      onTooltipOpen: () => {
        clearResetTimer();
        setIsImmediateMode(true);
      },
      onTooltipClose: () => {
        clearResetTimer();
        resetTimerRef.current = setTimeout(() => {
          setIsImmediateMode(false);
          resetTimerRef.current = null;
        }, skipDelayDuration);
      },
    };

    return (
      <TooltipProviderContext.Provider value={contextValue}>
        {children}
      </TooltipProviderContext.Provider>
    );
  },
  {
    Context: TooltipProviderContext,
    defaultDelayDuration,
    defaultSkipDelayDuration,
  },
);
