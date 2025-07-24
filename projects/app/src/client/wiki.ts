import type { HanziText, HanziWord } from "@/data/model";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import type { CustomComponentsProp } from "@bacons/mdx";
import { lazy } from "react";

type MdxComponent = React.FC<{
  components?: CustomComponentsProp;
}>;

const lazyMdx = <Mdx extends MdxComponent>(
  importFn: () => Promise<{ default: Mdx }>,
) =>
  lazy(async () => {
    await devToolsSlowQuerySleepIfEnabled();
    return await importFn();
  });

// prettier-ignore
const registry: Record<string, MdxComponent> = {
  // <pyly-glob-template glob="./wiki/**/*.mdx" template="  \"${relpathWithoutExt}\": lazyMdx(() => import(`${path}`)),">
  "上/meaning": lazyMdx(() => import(`./wiki/上/meaning.mdx`)),
  "上/meaningMnemonic": lazyMdx(() => import(`./wiki/上/meaningMnemonic.mdx`)),
  "上/pronunciation": lazyMdx(() => import(`./wiki/上/pronunciation.mdx`)),
  "上/~above/meaning": lazyMdx(() => import(`./wiki/上/~above/meaning.mdx`)),
  "上/~on/meaning": lazyMdx(() => import(`./wiki/上/~on/meaning.mdx`)),
  "你好/pronunciation": lazyMdx(() => import(`./wiki/你好/pronunciation.mdx`)),
  "你好/~hello/meaning": lazyMdx(() => import(`./wiki/你好/~hello/meaning.mdx`)),
// </pyly-glob-template>
};

export function getWikiMdxHanziMeaning(
  hanzi: HanziText,
): MdxComponent | undefined {
  return registry[`${hanzi}/meaning`];
}

export function getWikiMdxHanziMeaningMnemonic(
  hanzi: HanziText,
): MdxComponent | undefined {
  return registry[`${hanzi}/meaningMnemonic`];
}

export function getWikiMdxHanziPronunciation(
  hanzi: HanziText,
): MdxComponent | undefined {
  return registry[`${hanzi}/pronunciation`];
}

export function getWikiMdxHanziWordMeaning(
  hanziWord: HanziWord,
): MdxComponent | undefined {
  return registry[`${hanziWordToPath(hanziWord)}/meaning`];
}

function hanziWordToPath(hanziWord: HanziWord): string {
  return hanziWord.replace(`:`, `/~`);
}
