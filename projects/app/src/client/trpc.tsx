import type { AppRouter } from "@/server/routers/_app";
import { httpSessionHeaderTx } from "@/util/http";
import type { QueryClient } from "@tanstack/react-query";
import type { HTTPHeaders } from "@trpc/client";
import { httpLink, retryLink } from "@trpc/client";
import type { CreateTRPCReact } from "@trpc/react-query";
import { createTRPCReact } from "@trpc/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

export const trpc: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>();

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
        retryLink({
          retry(opts) {
            // Retry Vercel timeouts. These often happen on cold starts.
            if (
              opts.error.cause instanceof PylyVercelError &&
              opts.error.cause.code === `FUNCTION_INVOCATION_TIMEOUT`
            ) {
              // Retry twice, the second attempt should work.
              return opts.attempts < 2;
            }

            // Keep the tRPC default.
            return false;
          },
        }),
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

class PylyVercelError extends Error {
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
): PylyVercelError | undefined {
  const errorCode = response.headers.get(`x-vercel-error`);
  if (errorCode != null) {
    const errorId = response.headers.get(`x-vercel-id`) ?? ``;
    return new PylyVercelError(errorCode, errorId);
  }
}
