import type { AudioSpriteSource } from "@pinyinly/audio-sprites/client";
import type { Asset } from "expo-asset";
import type { AudioSource } from "expo-audio";
import type { ImageSource } from "expo-image";

declare global {
  type RnRequireSource = Parameters<(typeof Asset)[`fromModule`]>[0];

  interface NodeRequire {
    /**
     * @deprecated don't use `@/` alias in require statements because they
     * cannot be resolved in vitest. Instead use relative paths or convert to
     * module-level ESM imports.
     */
    (id: `@/${string}`): never;

    // Support for asset files. Anything that starts with a dot and ends with a
    // known extension.
    //
    // NOTE: these MUST be relative paths, see above.
    (
      id: `.${string}.${`ttf` | `otf` | `svg` | `png` | `jpg` | `riv` | `lottie.json`}`,
    ): RnRequireSource;
    (id: `.${string}.mp3`): AudioSource;
    (id: `.${string}.m4a`): AudioSpriteSource | AudioSource;
  }

  namespace NodeJS {
    // Necessary to avoid noPropertyAccessFromIndexSignature errors. Keep in
    // sync with `env.ts`.
    interface ProcessEnv {
      //
      // Posthog
      //

      EXPO_PUBLIC_POSTHOG_API_KEY?: string;

      //
      // Sentry
      //

      EXPO_PUBLIC_SENTRY_DSN?: string;
      PYLY_SENTRY_DEBUG?: string;
      PYLY_SENTRY_ENABLED?: string;
      PYLY_SENTRY_ENVIRONMENT?: string;
      PYLY_SENTRY_PROFILES_SAMPLE_RATE?: string;
      PYLY_SENTRY_TRACES_SAMPLE_RATE?: string;
      SENTRY_DSN?: string;

      //
      // S3 Assets
      //

      EXPO_PUBLIC_ASSETS_CDN_BASE_URL?: string;
      PYLY_ASSETS_S3_ACCESS_KEY_ID?: string;
      PYLY_ASSETS_S3_BUCKET?: string;
      PYLY_ASSETS_S3_ENDPOINT?: string;
      PYLY_ASSETS_S3_SECRET_ACCESS_KEY?: string;

      //
      // Open AI
      //

      PYLY_OPENAI_API_KEY?: string;

      //
      // Gemini API
      //

      PYLY_GEMINI_IMAGE_API_KEY?: string;

      //
      // Github Actions
      //

      /**
       * Set in both CI testing and deployment environments.
       */
      CI?: string;

      //
      // Vitest
      //

      NODE_ENV?: string;
      PYLY_SLIM_WIKI_FOR_TESTING?: string;
      TIMING?: string;

      //
      // Postmark (emails)
      //

      PYLY_POSTMARK_SERVER_TOKEN?: string;

      //
      // Other
      //

      EXPO_PUBLIC_USE_STATIC?: string | boolean; // boolean during static render, string on web
      EXPO_TUNNEL_SUBDOMAIN?: string;
      PYLY_JWT_KEY_BASE64?: string;
      PYLY_PREFLIGHT_CHECK_PRIVATE_ENV_VARS?: string;
    }
  }
}

declare module "*.jpg" {
  const source: ImageSource;
  export default source;
}

declare module "*.png" {
  const source: ImageSource;
  export default source;
}

declare module "*.webp" {
  const source: ImageSource;
  export default source;
}

declare module "*.gif" {
  const source: ImageSource;
  export default source;
}

export {};
