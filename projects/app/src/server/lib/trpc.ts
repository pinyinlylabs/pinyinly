import { sentryDsn } from "@/env";
import * as Sentry from "@sentry/node";
import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./trpcContext";

Sentry.init({
  dsn: sentryDsn,
});

// Avoid exporting the entire t-object since it's not very descriptive. For
// instance, the use of a t variable is common in i18n libraries.
const t = initTRPC.context<Context>().create();

const sentryMiddleware = t.middleware(
  Sentry.trpcMiddleware({
    attachRpcInput: true,
  }),
);

export const router = t.router;

// Use the Sentry middleware for all procedures to report all errors.
export const procedure = t.procedure.use(sentryMiddleware);

export const authedProcedure = procedure.use(async function isAuthed(opts) {
  const { session } = opts.ctx;
  if (session == null) {
    throw new TRPCError({ code: `UNAUTHORIZED` });
  }
  return opts.next({
    ctx: {
      session,
    },
  });
});
