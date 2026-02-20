/**
 * Slim wiki registry for CI testing builds
 *
 * This module provides a minimal set of wiki entries used during CI builds. It
 * avoids bundling 3000+ MDX files into the Metro bundle, drastically reducing
 * build time.
 */

import type { WikiRegistryEntry } from "./wikiRegistry.util";
import { lazyMdx } from "./wikiRegistry.util";

// prettier-ignore
export const _wikiRegistry: Record<string, WikiRegistryEntry> = {
  // <pyly-glob-template glob="./wiki/一*/meaning.mdx" template="  \"${relpath.split('/')[0]}\": lazyMdx(async () => import(`${path}`)),">
  "一": lazyMdx(async () => import(`./wiki/一/meaning.mdx`)),
  "一下儿": lazyMdx(async () => import(`./wiki/一下儿/meaning.mdx`)),
  "一些": lazyMdx(async () => import(`./wiki/一些/meaning.mdx`)),
  "一会儿": lazyMdx(async () => import(`./wiki/一会儿/meaning.mdx`)),
  "一共": lazyMdx(async () => import(`./wiki/一共/meaning.mdx`)),
  "一切": lazyMdx(async () => import(`./wiki/一切/meaning.mdx`)),
  "一半": lazyMdx(async () => import(`./wiki/一半/meaning.mdx`)),
  "一块儿": lazyMdx(async () => import(`./wiki/一块儿/meaning.mdx`)),
  "一定": lazyMdx(async () => import(`./wiki/一定/meaning.mdx`)),
  "一方面": lazyMdx(async () => import(`./wiki/一方面/meaning.mdx`)),
  "一样": lazyMdx(async () => import(`./wiki/一样/meaning.mdx`)),
  "一点儿": lazyMdx(async () => import(`./wiki/一点儿/meaning.mdx`)),
  "一点点": lazyMdx(async () => import(`./wiki/一点点/meaning.mdx`)),
  "一生": lazyMdx(async () => import(`./wiki/一生/meaning.mdx`)),
  "一直": lazyMdx(async () => import(`./wiki/一直/meaning.mdx`)),
  "一般": lazyMdx(async () => import(`./wiki/一般/meaning.mdx`)),
  "一起": lazyMdx(async () => import(`./wiki/一起/meaning.mdx`)),
  "一路平安": lazyMdx(async () => import(`./wiki/一路平安/meaning.mdx`)),
  "一路顺风": lazyMdx(async () => import(`./wiki/一路顺风/meaning.mdx`)),
  "一边": lazyMdx(async () => import(`./wiki/一边/meaning.mdx`)),
  "一部分": lazyMdx(async () => import(`./wiki/一部分/meaning.mdx`)),
// </pyly-glob-template>
}
