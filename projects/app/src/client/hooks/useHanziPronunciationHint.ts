import { HanziPronunciationHintProvider } from "@/client/ui/HanziPronunciationHintProvider";
import { invariant } from "@pinyinly/lib/invariant";
import { use } from "react";

export function useHanziPronunciationHint() {
  const ctx = use(HanziPronunciationHintProvider.Context);
  invariant(
    ctx !== null,
    `useHanziPronunciationHint must be used within a HanziPronunciationHintProvider` satisfies HasNameOf<
      typeof useHanziPronunciationHint
    >,
  );
  return ctx;
}
