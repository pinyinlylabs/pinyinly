import { invariant } from "@pinyinly/lib/invariant";
import type { Debugger } from "debug";
import type { DbCache } from "./cache.js";

export const fetchWithCache = async (
  body: Parameters<typeof fetch>[0],
  ctx: {
    dbCache: DbCache;
    debug?: Debugger;
  },
) => {
  const debug = ctx.debug?.extend(`fetchWithCache`);
  const cacheKey = JSON.stringify(body);
  const cached = ctx.dbCache.get(cacheKey);
  if (cached == null) {
    debug?.(`Making fetch request: %O`, body);
    const response = await fetch(body);
    const result = await response.text();
    debug?.(`response size: %O`, result.length);
    ctx.dbCache.set(cacheKey, result);
    return result;
  }
  invariant(typeof cached === `string`);
  return cached;
};
