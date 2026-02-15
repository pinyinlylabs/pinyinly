import { retryLink } from "@trpc/client";

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

export const vercelTimeoutRetryLink = retryLink({
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
});
