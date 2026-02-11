import { trpc } from "@/client/trpc";
import { httpSessionHeaderTx } from "@/util/http";
import type { QueryClient } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import type { HTTPHeaders } from "@trpc/client";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  maybeParseVercelError,
  vercelTimeoutRetryLink,
} from "./TrpcProvider.utils";

export const TrpcProvider = ({
  children,
  queryClient,
  getServerSessionId,
}: {
  children: ReactNode;
  queryClient: QueryClient;
  getServerSessionId: () => Promise<string | null>;
}) => {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        vercelTimeoutRetryLink,
        httpLink({
          url: `/api/trpc`,

          async headers() {
            const result: HTTPHeaders = {};

            const sessionId = await getServerSessionId();
            if (sessionId != null) {
              result[httpSessionHeaderTx] = sessionId;
            }

            return result;
          },

          fetch: async (input, init) => {
            // Add error parsing for Vercel errors that don't conform to the
            // tRPC spec and would otherwise be swallowed as:
            //
            // > The string did not match the expected pattern.
            const res = await fetch(input, init as RequestInit);
            if (!res.ok) {
              const vercelError = maybeParseVercelError(res);
              if (vercelError != null) {
                throw vercelError;
              }
            }
            return res;
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {children}
    </trpc.Provider>
  );
};
