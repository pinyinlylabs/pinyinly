import { useNewQueryClient } from "@/client/hooks/useNewQueryClient";
import { TrpcProvider } from "@/client/trpc";
import { memoize0 } from "@pinyinly/lib/collections";
import type { QueryClient } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { createContext } from "react";

const Context = createContext<{
  // Use a separate query client for device store (separate from the device
  // session query client). Because device store is global and not scoped to the
  // logged-in state.
  queryClient: QueryClient;
} | null>(null);

/**
 * Provides all the state/store contexts needed to access the device store.
 *
 * - <TrpcProvider> -- required for tRPC queries to work for unauthenticated
 *   auth procedure calls (so you can log in or sign up).
 * - <Context.Provider> -- provides a separate query client for unauthenticated
 *   requests and device store caching.
 */
export const DeviceStoreProvider = Object.assign(
  function DeviceStoreProvider({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();

    return (
      <TrpcProvider
        queryClient={queryClient}
        getServerSessionId={nullServerSessionId}
      >
        <Context.Provider value={{ queryClient }}>{children}</Context.Provider>
      </TrpcProvider>
    );
  },
  { Context },
);

const nullServerSessionId = memoize0(() => Promise.resolve(null));
