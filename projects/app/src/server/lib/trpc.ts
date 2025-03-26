import { trpcMiddleware } from "@sentry/core";
import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./trpcContext";

// Avoid exporting the entire t-object since it's not very descriptive. For
// instance, the use of a t variable is common in i18n libraries.
const t = initTRPC.context<Context>().create({
  errorFormatter: ({ shape, error }) => {
    return {
      ...shape,
      // Don't expose server-side error messages to the client as they might
      // contain sensitive information.
      message: __DEV__ ? error.message : `An error occurred`,
    };
  },
});

const sentryMiddleware = t.middleware(
  trpcMiddleware({
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
  return await opts.next({
    ctx: {
      session,
    },
  });
});
