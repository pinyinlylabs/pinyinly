import { preflightCheckEnvVars } from "@/util/env";
import { invariant } from "@haohaohow/lib/invariant";
import { sentryMiddleware } from "@inngest/middleware-sentry";
import { Inngest } from "inngest";
import * as postmark from "postmark";
import { z } from "zod";

const { POSTMARK_SERVER_TOKEN } = process.env;

if (preflightCheckEnvVars) {
  invariant(POSTMARK_SERVER_TOKEN != null, `POSTMARK_SERVER_TOKEN is required`);
}

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

// Your new function:
const helloWorld2 = inngest.createFunction(
  { id: `hello-world2` },
  { event: `test/hello.world2` },
  async ({ step }) => {
    await step.sleep(`wait-a-moment`, `1s`);
    await step.sleep(`wait-a-moment2`, `1s`);

    const data2 = await step.run(`getData2`, () => `data2`);

    const data3 = await step.run(`getData3`, () =>
      z
        .object({
          email: z.string(),
        })
        .parse({ email: `hardcoded email` }),
    );

    return {
      data2,
      data3,
    };
  },
);

const helloWorldEmail = inngest.createFunction(
  { id: `hello-world-email` },
  { event: `test/hello.world.email` },
  async ({ step }) => {
    invariant(POSTMARK_SERVER_TOKEN != null);
    const client = new postmark.ServerClient(POSTMARK_SERVER_TOKEN);

    const response = await step.run(`sendEmail`, () =>
      client.sendEmail({
        From: `hello@haohao.how`,
        To: `brad@haohao.how`,
        Subject: `Hello World`,
        TextBody: `Hello World`,
        HtmlBody: `<strong>Hello</strong> World`,
        MessageStream: `outbound`,
      }),
    );

    return {
      response,
    };
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [helloWorld, helloWorld2, helloWorldEmail];
