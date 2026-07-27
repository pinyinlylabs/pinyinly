import { openaiApiKey } from "@/util/env";
import { memoize0 } from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";
import { OpenAI } from "openai";
import { fetch as inngestFetch } from "inngest";

export const getOpenAIClient = memoize0((): OpenAI => {
  return new OpenAI({
    fetch: inngestFetch,
    apiKey: nonNullable(openaiApiKey),
  });
});
