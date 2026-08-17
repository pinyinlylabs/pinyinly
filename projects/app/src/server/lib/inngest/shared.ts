import type { AppRouter } from "@/server/routers/_app";
import { httpSessionHeaderTx } from "@/util/http";
import { memoizeGlobalThis } from "@pinyinly/lib/collections";
import { createTRPCClient, httpLink } from "@trpc/client";
import { RetryAfterError, fetch as inngestFetch } from "inngest";
import throttle from "lodash/throttle";

declare global {
  var __pylyCheckIsOfflinePrev:
    | { checkedAtMs: number; result: boolean }
    | undefined;
}

/**
 * Check if there's an internet connection by attempting a fetch.
 * Returns false if offline, allowing sync functions to skip gracefully.
 */
export const checkIsOffline = memoizeGlobalThis(`checkIsOffline`, () =>
  throttle(async function checkIsOffline(): Promise<boolean> {
    try {
      const response = await fetch(`https://cloudflare.com/cdn-cgi/trace`, {
        method: `HEAD`,
        keepalive: false,
        signal: AbortSignal.timeout(10_000),
        cache: `no-cache`,
      });
      // avoid memory leak
      await response.body?.cancel();
      return false;
    } catch {
      return true;
    }
  }, 5000),
);

export async function onlineOrRetryLater() {
  const isOffline = await checkIsOffline();
  if (isOffline) {
    throw new RetryAfterError(`No internet connection`, `10m`);
  }
}

export function createTrpcClient(url: string, sessionId: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        fetch: inngestFetch,
        url,
        headers() {
          return {
            [httpSessionHeaderTx]: sessionId,
          };
        },
      }),
    ],
  });
}
