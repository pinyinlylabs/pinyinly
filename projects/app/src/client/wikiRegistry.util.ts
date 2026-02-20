import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { lazy } from "react";
import type { MdxComponentType } from "./ui/MDXComponents.utils";

export interface WikiMdxModule {
  default: MdxComponentType;
  // JSON imports have unbranded string types, so we use unknown and cast
  characterData?: unknown;
}

export interface WikiRegistryEntry {
  component: MdxComponentType;
  importFn: () => Promise<WikiMdxModule>;
}

export const lazyMdx = (
  importFn: () => Promise<WikiMdxModule>,
): WikiRegistryEntry => ({
  component: lazy(async () => {
    await devToolsSlowQuerySleepIfEnabled();
    return importFn();
  }),
  importFn,
});
