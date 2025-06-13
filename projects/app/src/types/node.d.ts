import type { AudioSource } from "expo-audio";

declare global {
  type RnRequireSource =
    // Web
    | string
    // Native
    | number;

  interface NodeRequire {
    // Support for asset files. Anything that starts with a dot and ends with a
    // known extension.
    (
      id: `${string}.${`ttf` | `otf` | `svg` | `png` | `riv` | `lottie.json`}`,
    ): RnRequireSource;
    (id: `${string}.mp3`): AudioSource;
  }

  namespace NodeJS {
    // Necessary to avoid noPropertyAccessFromIndexSignature errors. Keep in
    // sync with `env.ts`.
    interface ProcessEnv {
      EXPO_PUBLIC_POSTHOG_API_KEY?: string;
      EXPO_PUBLIC_REPLICACHE_LICENSE_KEY?: string;
      EXPO_PUBLIC_SENTRY_DSN?: string;
      EXPO_PUBLIC_USE_STATIC?: string | boolean; // boolean during static render, string on web
      EXPO_TUNNEL_SUBDOMAIN?: string;
      HHH_PREFLIGHT_CHECK_ENV_VARS?: string;
      HHH_SENTRY_DEBUG?: string;
      HHH_SENTRY_ENABLED?: string;
      HHH_SENTRY_ENVIRONMENT?: string;
      HHH_SENTRY_PROFILES_SAMPLE_RATE?: string;
      HHH_SENTRY_TRACES_SAMPLE_RATE?: string;
      NODE_ENV?: string;
      POSTMARK_SERVER_TOKEN?: string;
      SENTRY_DSN?: string;
    }
  }
}

export {};
