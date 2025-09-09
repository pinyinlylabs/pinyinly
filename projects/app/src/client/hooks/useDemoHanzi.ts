import type { HanziText } from "@/data/model";
import { useLocalSearchParams, useRouter } from "expo-router";

/**
 * A hook that provides a demo hanzi character and ensures it's part of the URL,
 * so that the URL is the UI for editing the value (rather than needing a
 * separate UI widget).
 */
export function useDemoHanzi(defaultHanzi: HanziText) {
  const { hanzi } = useLocalSearchParams<{ hanzi?: HanziText }>();
  const router = useRouter();

  if (hanzi == null) {
    // Redirect to set a default hanzi. This way the query string is always
    // visible in the URL and it's self documenting if you want to preview a
    // different hanzi.
    router.setParams({ hanzi: defaultHanzi });
  }

  return hanzi ?? defaultHanzi;
}
