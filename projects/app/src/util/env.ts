import { memoize0 } from "@pinyinly/lib/collections";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type { RemoveIndexSignature } from "@pinyinly/lib/types";

const missingPrivateEnvVars: string[] = [];

// true when running under the Node.js test runner.
export const isRunningTests = `NODE_TEST_CONTEXT` in process.env;

// If enabled modules should fast-fail when environment variables are missing
// (rather than waiting until their code paths are accessed).
//
// This isn't needed for `EXPO_PUBLIC_` environment variables as these are
// replaced at build time so they need to be checked using the patched
// babel-preset-expo-npm and having `PYLY_STRICT_EXPO_ENV_VARS` set.
const preflightCheckEnvVars = truthyOrFalse(
  `PYLY_PREFLIGHT_CHECK_PRIVATE_ENV_VARS`,
);

export const isCi = truthyOrFalse(`CI`);

export const isTiming = truthyOrFalse(`TIMING`);

privateStringOrNull(`PYLY_JWT_KEY_BASE64`); // Include in preflight check since it's critical for auth to work.
export const jwtKey = memoize0(() => {
  return Buffer.from(nonNullable(process.env.PYLY_JWT_KEY_BASE64), `base64`);
});

export const geminiImageApiKey = privateStringOrNull(
  `PYLY_GEMINI_IMAGE_API_KEY`,
);

export const assetsS3Endpoint = privateStringOrNull(`PYLY_ASSETS_S3_ENDPOINT`);

export const assetsS3AccessKeyId = privateStringOrNull(
  `PYLY_ASSETS_S3_ACCESS_KEY_ID`,
);

export const assetsS3SecretAccessKey = privateStringOrNull(
  `PYLY_ASSETS_S3_SECRET_ACCESS_KEY`,
);

export const assetsS3Bucket = privateStringOrNull(`PYLY_ASSETS_S3_BUCKET`);

export const postmarkServerToken = privateStringOrNull(
  `PYLY_POSTMARK_SERVER_TOKEN`,
);

export const openaiApiKey = privateStringOrNull(`PYLY_OPENAI_API_KEY`);

// In production fail on startup so that healthchecks don't pass with missing
// configuration. In development, it's less disruptive to allow the app to start
// and only fail when the relevant code paths are accessed.

if (preflightCheckEnvVars && missingPrivateEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingPrivateEnvVars.join(`, `)}`,
  );
}

//
// Public environment variables  (i.e. EXPO_PUBLIC_*)
//
// These are checked in a patched version of babel-preset-expo-npm, which throws
// if any EXPO_PUBLIC_ variable is accessed but not set. This is necessary
// because these variables are inlined at build time, so they won't be caught by
// checks like the above that run at runtime.
//
// Default values should be used to avoid needing to set these in local and test
// environments or having null checks everywhere.
//

export const assetsCdnBaseUrl =
  process.env.EXPO_PUBLIC_ASSETS_CDN_BASE_URL ?? `/`;

invariant(
  assetsCdnBaseUrl.endsWith(`/`),
  `EXPO_PUBLIC_ASSETS_CDN_BASE_URL must end with a slash`,
);

// Helpers

type PrivateEnvVarKey = Exclude<
  keyof RemoveIndexSignature<typeof process.env>,
  // EXPO_PUBLIC_ variables are inlined at build time, and they won't work if
  // they're not literally `process.env.EXPO_PUBLIC_…`
  `EXPO_PUBLIC_${string}`
>;

function privateStringOrNull(key: PrivateEnvVarKey): string | null {
  const envValue = process.env[key];
  const parsedValue =
    typeof envValue === `string` && envValue.length > 0 ? envValue : null;
  if (parsedValue === null) {
    missingPrivateEnvVars.push(key);
  }
  return parsedValue;
}

function truthyOrFalse(key: PrivateEnvVarKey): boolean {
  const envValue = process.env[key];
  const parsedValue = envValue === `true` || envValue === `1`;
  return parsedValue;
}
