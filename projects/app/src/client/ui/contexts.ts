import type { Db } from "@/client/query";
import type { Rizzle } from "@/data/rizzleSchema";
import type { Skill } from "@/data/model";
import type { SkillReviewQueue } from "@/data/skills";
import type { QueryClient } from "@tanstack/react-query";
import { createContext } from "react";
import type { ReactNode } from "react";
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

export interface HeaderTitleScrollTriggerState {
  id: string;
  title: string;
  top: number | null;
}

export interface HeaderContextValue {
  title: string | null;
  showTitle: boolean;
  defaultTitle: string | null;
  setDefaultTitle: (title: string | null) => void;
  upsertTitleScrollTriggerState: (state: HeaderTitleScrollTriggerState) => void;
  removeTitleScrollTriggerState: (id: string) => void;
  actionsSlotEnabled: boolean;
  actionsSlotContent: ReactNode;
  setActionsSlotContent: (content: ReactNode | null) => void;
}

export const HeaderContext = createContext<HeaderContextValue | null>(null);

/** Modal ordering and registration used to scope keyboard shortcuts. */
export interface KeyboardShortcutModalContextValue {
  /** Open modal IDs, ordered from the oldest to the topmost modal. */
  modalStack: readonly string[];
  /** Add or remove this modal from the active shortcut stack. */
  setModalActive: (id: string, active: boolean) => void;
}

export const KeyboardShortcutModalContext =
  createContext<KeyboardShortcutModalContextValue | null>(null);

/** Identifies the modal scope containing a shortcut consumer, if any. */
export const KeyboardShortcutModalIdContext = createContext<string | null>(
  null,
);

export type SkillQueueContextValue = DeepReadonly<
  | {
      loading: false;
      reviewQueue: SkillReviewQueue;
      targetSkills?: ReadonlySet<Skill>;
    }
  | {
      loading: true;
    }
>;
export const SkillQueueContext = createContext<SkillQueueContextValue | null>(
  null,
);
