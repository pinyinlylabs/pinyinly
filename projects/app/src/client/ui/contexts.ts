import type { Db } from "@/client/query";
import type { Rizzle } from "@/data/rizzleSchema";
import type { SkillReviewQueue } from "@/data/skills";
import type { QueryClient } from "@tanstack/react-query";
import { createContext } from "react";
import type { DeepReadonly } from "ts-essentials";

// React contexts are here so that they're compatible with hot module
// replacement. If we put contexts in the same file as their providers, then hot
// module replacement would cause context values to reset, which can cause
// issues like losing the user's session and getting logged out.

export const DeviceStoreContext = createContext<{
  // Use a separate query client for device store (separate from the device
  // session query client). Because device store is global and not scoped to the
  // logged-in state.
  queryClient: QueryClient;
} | null>(null);

export const DbContext = createContext<Db | null>(null);

export const AudioContextContext = createContext<AudioContext | null>(null);

export const RizzleContext = createContext<Rizzle | null>(null);

export type SkillQueueContextValue = DeepReadonly<
  | {
      loading: false;
      reviewQueue: SkillReviewQueue;
      version: number;
    }
  | {
      loading: true;
    }
>;
export const SkillQueueContext = createContext<SkillQueueContextValue | null>(
  null,
);
