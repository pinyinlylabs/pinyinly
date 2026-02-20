import { Suspense } from "@/client/ui/Suspense";
import type { HanziText } from "@/data/model";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { useLocalSearchParams } from "expo-router";
import { lazy } from "react";

export default function WikiHanziPage() {
  const hanzi = useLocalSearchParams<`/wiki/[hanzi]`>().hanzi as HanziText;

  return (
    <Suspense fallback={null}>
      <WikiHanziPageImpl hanzi={hanzi} />
    </Suspense>
  );
}

const WikiHanziPageImpl = lazy(async () => {
  await devToolsSlowQuerySleepIfEnabled();

  const { WikiHanziPageImpl } = await import(
    `../../../../client/ui/WikiHanziPageImpl`
  );
  return { default: WikiHanziPageImpl };
});
