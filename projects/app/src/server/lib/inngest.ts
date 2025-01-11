import { sentryDsn } from "@/env";
import { sentryMiddleware } from "@inngest/middleware-sentry";
import * as Sentry from "@sentry/node";
import { Inngest } from "inngest";
import { z } from "zod";

Sentry.init({
  dsn: sentryDsn,
});

// Create a client to send and receive events
export const inngest = new Inngest({
  id: `my-app`,
  middleware: [sentryMiddleware()],
});

// Your new function:
const helloWorld = inngest.createFunction(
  { id: `hello-world` },
  { event: `test/hello.world` },
  async ({ event, step }) => {
    await step.sleep(`wait-a-moment`, `1s`);

    const data2 = await step.run(`validateData`, () =>
      z
        .object({
          email: z.string(),
        })
        .partial({ email: true })
        .parse(event.data),
    );

    const data = z
      .object({
        email: z.string(),
      })
      .partial({ email: true })
      .parse(event.data);

    return {
      message: `Hello ${data.email ?? `world`}!`,
      message2: `Hello ${data2.email ?? `world`}!`,
    };
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [helloWorld];
