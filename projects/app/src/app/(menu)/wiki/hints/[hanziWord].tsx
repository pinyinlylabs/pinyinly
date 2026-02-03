import { Suspense } from "@/client/ui/Suspense";
import type { HanziWord } from "@/data/model";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { useLocalSearchParams } from "expo-router";
import { lazy } from "react";

export default function WikiHanziHintEditorPage() {
  const params = useLocalSearchParams<`/wiki/hints/[hanziWord]`>();
  const hanziWord = decodeURIComponent(params.hanziWord) as HanziWord;

  return (
    <Suspense fallback={null}>
      <WikiHanziHintEditorImpl hanziWord={hanziWord} />
    </Suspense>
  );
}

const WikiHanziHintEditorImpl = lazy(async () => {
  await devToolsSlowQuerySleepIfEnabled();

  const { WikiHanziHintEditor } = await import(
    `../../../../client/ui/WikiHanziHintEditor`
  );
  return { default: WikiHanziHintEditor };
});
