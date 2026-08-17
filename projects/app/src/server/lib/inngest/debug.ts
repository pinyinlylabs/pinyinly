import { invoke } from "inngest";
import z from "zod";
import { postmarkServerToken } from "@/util/env";
import { nonNullable } from "@pinyinly/lib/invariant";
import * as Crypto from "expo-crypto";
import * as postmark from "postmark";
import { inngest } from "./client";

export const devTestThrowRootError = inngest.createFunction(
  {
    id: `debug/test-throw-root-error`,
    triggers: [invoke(z.object())],
  },
  () => {
    throw new Error(`test error`);
  },
);

export const devTestThrowStepError = inngest.createFunction(
  {
    id: `debug/test-throw-step-error`,
    triggers: [invoke(z.object())],
  },
  async ({ step }) => {
    await step.run(`throw error`, () => {
      throw new Error(`test error`);
    });
  },
);

export const devTestLogRootError = inngest.createFunction(
  {
    id: `debug/test-log-root-error`,
    triggers: [invoke(z.object())],
  },
  ({ logger }) => {
    const error = new Error(`test error`);
    logger.error({ err: error }, `test error`);
  },
);

export const devTestLogStepError = inngest.createFunction(
  {
    id: `debug/test-log-step-error`,
    triggers: [invoke(z.object())],
  },
  async ({ step, logger }) => {
    await step.run(`log error`, () => {
      const error = new Error(`test error`);
      logger.error({ err: error }, `test error`);
    });
  },
);

export const devTestCrypto = inngest.createFunction(
  {
    id: `debug/test-crypto`,
    triggers: [invoke(z.object())],
  },
  async () => {
    return {
      digest: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `test`,
      ),
    };
  },
);

export const helloWorldEmail = inngest.createFunction(
  {
    id: `debug/hello-world-email`,
    triggers: [invoke(z.object())],
  },
  async ({ step }) => {
    const client = new postmark.ServerClient(nonNullable(postmarkServerToken));

    const response = await step.run(`sendEmail`, async () =>
      client.sendEmail({
        From: `hello@pinyinly.com`,
        To: `brad@pinyinly.com`,
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

export const functions = [
  devTestThrowRootError,
  devTestThrowStepError,
  devTestLogRootError,
  devTestLogStepError,
  devTestCrypto,
  helloWorldEmail,
];
