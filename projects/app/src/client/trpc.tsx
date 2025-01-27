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

          fetch: async (input, init) => {
            // Add error parsing for Vercel errors that don't conform to the
            // tRPC spec and would otherwise be swallowed as:
            //
            // > The string did not match the expected pattern.
            const res = await fetch(input, init);
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

class HhhVercelError extends Error {
  code: string;
  id: string;

  constructor(code: string, id: string) {
    super(`Vercel error ${code} (id=${id})`);
    this.name = this.constructor.name;
    this.code = code;
    this.id = id;
  }
}

export function maybeParseVercelError(
  response: Response,
): HhhVercelError | undefined {
  const errorCode = response.headers.get(`x-vercel-error`);
  if (errorCode != null) {
    const errorId = response.headers.get(`x-vercel-id`) ?? ``;
    return new HhhVercelError(errorCode, errorId);
  }
}
