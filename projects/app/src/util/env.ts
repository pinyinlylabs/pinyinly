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
