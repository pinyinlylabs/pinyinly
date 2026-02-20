import type { HanziText, WikiCharacterData } from "@/data/model";
import { memoize1 } from "@pinyinly/lib/collections";
import type { MdxComponentType } from "./ui/MDXComponents.utils";
// Metro resolver will conditionally route this to wikiRegistry.slim.ts in CI
import { _wikiRegistry as registry } from "./wikiRegistry";

export function getWikiMdxHanziMeaning(
  hanzi: HanziText,
): MdxComponentType | undefined {
  return registry[hanzi]?.component;
}

export const getWikiCharacterData = memoize1(
  async (hanzi: HanziText): Promise<WikiCharacterData | undefined> => {
    const entry = registry[hanzi];
    if (entry == null) {
      return undefined;
    }
    const module = await entry.importFn();
    // Character data from JSON is validated at build time, safe to cast
    return module.characterData as WikiCharacterData | undefined;
  },
);

export const registry_ForTesting = registry;
