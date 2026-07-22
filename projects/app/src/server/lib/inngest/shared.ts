import type { AppRouter } from "@/server/routers/_app";
import { httpSessionHeaderTx } from "@/util/http";
import { createTRPCClient, httpLink } from "@trpc/client";
import { memoizeGlobalThis } from "@pinyinly/lib/collections";
import { RetryAfterError } from "inngest";
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
    const timeoutMs = 5000;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(`https://cloudflare.com/cdn-cgi/trace`, {
        method: `HEAD`,
        keepalive: false,
        signal: controller.signal,
        cache: `no-cache`,
        window: null,
      });
      // avoid memory leak
      await response.body?.cancel();
      return false;
    } catch {
      return true;
    } finally {
      controller.abort();
      clearTimeout(timeout);
    }
  }, 5000),
);

export async function onlineOrRetryLater() {
  const isOffline = await checkIsOffline();
  if (isOffline) {
    throw new RetryAfterError(
      `No internet connection`,
      10 * 60 * 1000 /* retry after 10 minutes */,
    );
  }
}

export function createTrpcClient(url: string, sessionId: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
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
