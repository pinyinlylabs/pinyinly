import { pinyinTextSchema } from "#data/model.js";
import type { ChatPrompt, ChatPromptMessage } from "#server/lib/ai.js";
import { renderPromptTemplate } from "#util/prompts.js";
import { memoize0 } from "@pinyinly/lib/collections";
import { readFile } from "@pinyinly/lib/fs";
import path from "node:path";
import { z } from "zod/v4";

export const hsk2026FilePath = path.join(import.meta.dirname, `hsk2026.json`);

export const hsk2026Schema = z.object({
  level1: z.array(z.string()),
  level2: z.array(z.string()),
  level3: z.array(z.string()),
  level4: z.array(z.string()),
  level5: z.array(z.string()),
  level6: z.array(z.string()),
  level7: z.array(z.string()),
});

export type Hsk2026Type = z.infer<typeof hsk2026Schema>;

export const loadHsk2026 = memoize0(async (): Promise<Hsk2026Type> => {
  const dataText = await readFile(hsk2026FilePath, `utf8`);
  return hsk2026Schema.parse(JSON.parse(dataText));
});

export const hskLevelJudgeEntrySchema = z.object({
  simplified: z.string(),
  traditional: z.string(),
  hskLevel: z.string(),
  pinyin: pinyinTextSchema,
  definition: z.array(z.string()),
});

export type HskLevelJudgeEntryType = z.infer<typeof hskLevelJudgeEntrySchema>;

export const hskLevelJudgeResultSchema = z.object({
  hskRequiredDefinitions: z.array(z.string()),
});

export type HskLevelJudgeResultType = z.infer<typeof hskLevelJudgeResultSchema>;

export const buildHskLevelJudgePrompt = (
  entry: HskLevelJudgeEntryType,
): ChatPrompt<typeof hskLevelJudgeResultSchema> => {
  const systemTemplate = `
You're a helpful Chinese learning assistant. Your job is to recommend which senses of a word should be learned for a given HSK level. HSK word lists just include the hanzi word, they don't stipulate which senses should be learned, so this can be confusing for students. Your job is to recommend which senses should be learned by students studying the HSK.

> A definition is made up of senses, and a sense is made up of glosses. […] Generally, glosses within a sense are synonyms and can be included to remove ambiguity, while senses represent wholly different meanings or uses of a word.

Rules:
- Return only the definitions that a student must learn for HSK.
- Do not edit any definition text, only omit entire definitions that are not required.
- Text in parenthesis "( )" are hints.
- Text in braces "{ }" are labels.
`.trim();

  const userTemplate = `
Provide a recommendation for:

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(entry, null, 2),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `none`,
    schema: hskLevelJudgeResultSchema,
  };
};
