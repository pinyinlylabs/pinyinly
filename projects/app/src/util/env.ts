/* eslint-disable @typescript-eslint/no-deprecated */
import { nonNullable } from "@pinyinly/lib/invariant";
import { memoize0 } from "@pinyinly/lib/collections";

// true when running under the Node.js test runner.
export const isRunningTests = `NODE_TEST_CONTEXT` in process.env;

const truthyStrings = new Set<string | undefined>([`true`, `1`]);

// If enabled modules should fast-fail when environment variables are missing
// (rather than waiting until their code paths are accessed).
//
// This isn't needed for `EXPO_PUBLIC_` environment variables as these are
// already checked as build time.
export const preflightCheckEnvVars = truthyStrings.has(
  process.env.PYLY_PREFLIGHT_CHECK_ENV_VARS ??
    process.env.HHH_PREFLIGHT_CHECK_ENV_VARS,
);

export const IS_CI = truthyStrings.has(process.env[`CI`]);

export const IS_TIMING = truthyStrings.has(process.env[`TIMING`]);

export const JWT_KEY = memoize0(() => {
  return Buffer.from(
    nonNullable(
      process.env.PYLY_JWT_KEY_BASE64 ?? process.env.HHH_JWT_KEY_BASE64,
    ),
    `base64`,
  );
});
