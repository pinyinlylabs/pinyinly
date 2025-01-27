/* eslint-disable @typescript-eslint/prefer-function-type */

declare global {
  interface NodeRequire {
    // Support for asset files. Anything that starts with a dot and ends with a
    // known extension.
    (id: `${string}.${`ttf` | `otf` | `svg` | `png`}`): string;
  }

  namespace NodeJS {
    // Necessary to avoid noPropertyAccessFromIndexSignature errors. Keep in
    // sync with `env.ts`.
    interface ProcessEnv {
      EXPO_PUBLIC_REPLICACHE_LICENSE_KEY?: string;
      EXPO_PUBLIC_SENTRY_DSN?: string;
      EXPO_PUBLIC_USE_STATIC?: string | boolean; // boolean during static render, string on web
      NEON_DATABASE_URL?: string;
      NODE_ENV?: string;
      POSTMARK_SERVER_TOKEN?: string;
    }
  }
}

export {};
