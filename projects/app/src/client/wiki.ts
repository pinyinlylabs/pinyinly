import type { HanziText } from "@/data/model";
import type { MdxComponentType } from "./ui/MDXComponents.utils";
// Metro resolver will conditionally route this to wikiRegistry.slim.ts in CI
import { _wikiRegistry as registry } from "./wikiRegistry";

export function getWikiMdxHanziMeaning(
  hanzi: HanziText,
): MdxComponentType | undefined {
  return registry[hanzi]?.component;
}

export const registry_ForTesting = registry;
