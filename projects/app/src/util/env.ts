// true when running under the Node.js test runner.
export const isRunningTests = `NODE_TEST_CONTEXT` in process.env;

// true when running CI (e.g. `moon ci`). This can be different from running
// tests (e.g. when `eas build` runs).
export const isRunningCi = `CI` in process.env;

export const failFastIfMissingEnvVars =
  !isRunningTests && !isRunningCi && !__DEV__;
