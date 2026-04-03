import { useNewQueryClient } from "@/client/ui/hooks/useNewQueryClient";
import type { PropsWithChildren } from "react";
import { TrpcProvider } from "./TrpcProvider";
import { DeviceStoreContext } from "./contexts";

/**
 * Provides all the state/store contexts needed to access the device store.
 *
 * - <TrpcProvider> -- required for tRPC queries to work for unauthenticated
 *   auth procedure calls (so you can log in or sign up).
 * - <Context.Provider> -- provides a separate query client for unauthenticated
 *   requests and device store caching.
 */
function DeviceStoreProvider({ children }: PropsWithChildren) {
  "use memo";
  const queryClient = useNewQueryClient();
  const nullServerSessionId = async () => null;

  return (
    <TrpcProvider
      queryClient={queryClient}
      getServerSessionId={nullServerSessionId}
    >
      <DeviceStoreContext.Provider value={{ queryClient }}>
        {children}
      </DeviceStoreContext.Provider>
    </TrpcProvider>
  );
}

DeviceStoreProvider.Context = DeviceStoreContext;

export { DeviceStoreProvider };
