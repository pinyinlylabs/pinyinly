import { nonNullable } from "@pinyinly/lib/invariant";
import { memoize0 } from "./collections";

// true when running under the Node.js test runner.
export const isRunningTests = `NODE_TEST_CONTEXT` in process.env;

const truthyStrings: readonly (string | undefined)[] = [`true`, `1`];

// If enabled modules should fast-fail when environment variables are missing
// (rather than waiting until their code paths are accessed).
//
// This isn't needed for `EXPO_PUBLIC_` environment variables as these are
// already checked as build time.
export const preflightCheckEnvVars = truthyStrings.includes(
  process.env.HHH_PREFLIGHT_CHECK_ENV_VARS,
);

export const JWT_KEY = memoize0(() => {
  return Buffer.from(nonNullable(process.env.HHH_JWT_KEY_BASE64), `base64`);
});
