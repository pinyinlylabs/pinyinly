import type { HanziText, HanziWord } from "@/data/model";
import { useLocalSearchParams, useRouter } from "expo-router";

/**
 * A hook that provides a demo hanzi word and ensures it's part of the URL,
 * so that the URL is the UI for editing the value (rather than needing a
 * separate UI widget).
 */
export function useDemoHanziWordKnob(defaultHanziWord: HanziWord): {
  hanziWord: HanziWord;
  setHanziWord: (hanziWord: HanziWord) => void;
};
export function useDemoHanziWordKnob(defaultHanziWord?: HanziWord): {
  hanziWord: HanziWord | undefined;
  setHanziWord: (hanziWord: HanziWord) => void;
};
export function useDemoHanziWordKnob(defaultHanziWord?: HanziWord) {
  const { hanziWord } = useLocalSearchParams<{
    hanziWord?: HanziWord;
  }>();
  const router = useRouter();

  function setHanziWord(hanziWord: HanziWord) {
    router.setParams({ hanziWord });
  }

  if (hanziWord == null && defaultHanziWord != null) {
    // Redirect to set a default hanzi. This way the query string is always
    // visible in the URL and it's self documenting if you want to preview a
    // different hanzi.
    setHanziWord(defaultHanziWord);
  }

  return {
    hanziWord: hanziWord ?? defaultHanziWord,
    setHanziWord,
  };
}

/**
 * A hook that provides a demo hanzi character and ensures it's part of the URL,
 * so that the URL is the UI for editing the value (rather than needing a
 * separate UI widget).
 */
export function useDemoHanziKnob(defaultHanzi: HanziText): {
  hanzi: HanziText;
  setHanzi: (hanzi: HanziText) => void;
};
export function useDemoHanziKnob(defaultHanzi?: HanziText): {
  hanzi: HanziText | undefined;
  setHanzi: (hanzi: HanziText) => void;
};
export function useDemoHanziKnob(defaultHanzi?: HanziText) {
  const { hanzi } = useLocalSearchParams<{
    hanzi?: HanziText;
  }>();
  const router = useRouter();

  function setHanzi(hanzi: HanziText) {
    router.setParams({ hanzi });
  }

  if (hanzi == null && defaultHanzi != null) {
    // Redirect to set a default hanzi. This way the query string is always
    // visible in the URL and it's self documenting if you want to preview a
    // different hanzi.
    setHanzi(defaultHanzi);
  }

  return {
    hanzi: hanzi ?? defaultHanzi,
    setHanzi,
  };
}

export const examplesStackClassName = `bg-bg lg:flex-1 lg:shrink lg:basis-1 flex-row flex-wrap justify-center gap-2 p-2 sm:justify-start`;
