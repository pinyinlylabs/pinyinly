import { HanziWordHintProvider } from "@/client/ui/HanziWordHintProvider";
import { invariant } from "@pinyinly/lib/invariant";
import { use } from "react";

export function useHanziWordHint() {
  const ctx = use(HanziWordHintProvider.Context);
  invariant(
    ctx !== null,
    `useHanziWordHint must be used within a HanziWordHintProvider` satisfies HasNameOf<
      typeof useHanziWordHint
    >,
  );
  return ctx;
}
