import type { AppRouter } from "@/server/routers/_app";
import { QueryClient } from "@tanstack/react-query";
import { HTTPHeaders, httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { ReactNode, useState } from "react";

export const trpc = createTRPCReact<AppRouter>();

export const TrpcProvider = ({
  children,
  queryClient,
  getSessionId,
}: {
  children: ReactNode;
  queryClient: QueryClient;
  getSessionId: () => Promise<string | null>; // Avoid circular dependency
}) => {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        vercelErrorTransformLink,
        httpLink({
          url: `/api/trpc`,

          async headers() {
            const result: HTTPHeaders = {};

            const sessionId = await getSessionId();
            if (sessionId != null) {
              result[`authorization`] = `HhhSessionId ${sessionId}`;
            }

            return result;
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
