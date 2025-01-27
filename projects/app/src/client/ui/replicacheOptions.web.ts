import { ReplicacheOptions } from "replicache";

// Intentionally DO NOT allow Expo top inline the environment variable,
// otherwise it will leak into the browser bundle otherwise the browser code
// will also think it's in static render mode and use the
// ExperimentalMemKVStore.
const IS_EXPO_STATIC_RENDER = process.env.EXPO_PUBLIC_USE_STATIC === true;
const NO_INDEXED_DB = typeof indexedDB === `undefined`;

// Safe-guard in case the heuristic is bad.
if (IS_EXPO_STATIC_RENDER !== NO_INDEXED_DB) {
  // Soft error to not break things too bad.
  setTimeout(() => {
    new Error(
      `detected static rendering, but indexedDB exists. perhaps the detection is broken?`,
    );
  });
}

export const kvStore: ReplicacheOptions<never>[`kvStore`] =
  // For Expo `static` rendering use in-memory KV store (as indexedDB is not
  // available) because Replicache is instantiated synchronously and
  // synchronously calls KV store APIs.
  NO_INDEXED_DB ? `mem` : `idb`;
