import type { ReplicacheOptions } from "replicache";

export const kvStore: ReplicacheOptions<never>[`kvStore`] =
  // For Expo `static` rendering use in-memory KV store (as indexedDB is not
  // available) because Replicache is instantiated synchronously and
  // synchronously calls KV store APIs.
  typeof indexedDB === `undefined` ? `mem` : `idb`;
