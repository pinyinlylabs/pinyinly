import { openaiApiKey } from "@/util/env";
import { memoize0 } from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";
import { OpenAI } from "openai";

export const getOpenAIClient = memoize0((): OpenAI => {
  return new OpenAI({
    apiKey: nonNullable(openaiApiKey),
  });
});
