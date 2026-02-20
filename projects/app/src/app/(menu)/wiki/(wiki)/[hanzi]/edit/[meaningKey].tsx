import { Suspense } from "@/client/ui/Suspense";
import { buildHanziWord } from "@/dictionary";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { useLocalSearchParams } from "expo-router";
import { lazy } from "react";

export default function WikiHanziHintEditorPage() {
  const params = useLocalSearchParams<`/wiki/[hanzi]/edit/[meaningKey]`>();
  const hanzi = decodeURIComponent(params.hanzi);
  const meaningKey = decodeURIComponent(params.meaningKey);
  const hanziWord = buildHanziWord(hanzi, meaningKey);

  return (
    <Suspense fallback={null}>
      <WikiHanziHintEditorImpl hanziWord={hanziWord} />
    </Suspense>
  );
}

const WikiHanziHintEditorImpl = lazy(async () => {
  await devToolsSlowQuerySleepIfEnabled();

  const { WikiHanziHintEditor } = await import(
    `../../../../../../client/ui/WikiHanziHintEditor`
  );
  return { default: WikiHanziHintEditor };
});
