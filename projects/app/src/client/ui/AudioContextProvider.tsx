import type { PropsWithChildren } from "react";
import { createContext, useEffect, useState } from "react";

const Context = createContext<AudioContext | null>(null);

/**
 * An audio context provider so that the AudioContext can be cleaned up
 * gracefully on unmount (useful in dev mode).
 */
export const AudioContextProvider = Object.assign(
  function AudioContextProvider({ children }: PropsWithChildren) {
    const [audioContext] = useState(() => new AudioContext());

    // Clean up the audio context on unmount. This is useful in development mode
    // to avoid "AudioContext was not allowed to start" errors when the app is
    // reloaded. In production, the audio context will be created once and
    // reused.
    useEffect(() => {
      return () => {
        audioContext.close().catch((error: unknown) => {
          console.error(`Failed to close audio context`, error);
        });
      };
    }, [audioContext]);

    return <Context.Provider value={audioContext}>{children}</Context.Provider>;
  },
  { Context },
);
