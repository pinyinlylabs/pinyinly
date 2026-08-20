import type { HanziCharacter, HanziText, PinyinText } from "@/data/model";
import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import type { DeepReadonly } from "ts-essentials";
import { z } from "zod";

export type CharacterCoreMeaningsSpecInputType = {
  character: HanziCharacter;
  usages: DeepReadonly<{ hanzi: HanziText; pinyin: PinyinText }[]>;
};

export const characterCoreMeaningsSpecSchema = z
  .object({
    coreMeanings: z.array(
      z.object({
        lemma: z.string(),
        primaryReading: z.string(),
        pronunciationExceptions: z.array(z.string()),
        description: z.string(),
        branches: z.array(
          z.object({
            lemma: z.string(),
            description: z.string(),
            occurrences: z.array(z.string()),
          }),
        ),
      }),
    ),
  })
  .strict()
  .meta({ title: `characterCoreMeaningsSpecSchema` });

export type CharacterCoreMeaningsSpecType = z.infer<
  typeof characterCoreMeaningsSpecSchema
>;

export function buildCharacterCoreMeaningsSpecPrompt(
  input: CharacterCoreMeaningsSpecInputType,
): ChatPrompt<typeof characterCoreMeaningsSpecSchema> {
  const systemTemplate = `
# Task

Infer the semantic ontology of a Chinese character from the supplied vocabulary.

The goal is **not** to reproduce dictionary senses.

Instead, discover the smallest set of stable **Core Meanings** that naturally explains how the character contributes meaning across the supplied words.

Think like a linguist discovering the semantic structure of the character, not like a dictionary writer.

## Principles

- Prefer the smallest set of Core Meanings that naturally explains the supplied vocabulary.
- A Branch should represent a genuine semantic development of its parent Core Meaning.
- Do not create separate Core Meanings when a Branch is sufficient.
- Do not merge genuinely unrelated meanings merely to reduce the number of Core Meanings.
- Every supplied occurrence must appear exactly once.
- Do not invent vocabulary that was not supplied.
- If the same written word appears multiple times with different pronunciations, treat them as separate occurrences.
- Do not include pinyin anywhere in the output except "primaryReading".

## Core Meaning

Each Core Meaning contains:

- "lemma"
- "primaryReading"
- optional "pronunciationExceptions"
- "description"
- "branches"

### lemma

"lemma" is an English dictionary headword.

Its purpose is to provide a stable semantic anchor for this Core Meaning.

Prefer a single common English lemma whenever possible.

Use lowercase unless the word is a proper noun.

Examples of formatting:

- "go"
- "line"
- "flower"
- "spend"
- "wood"

Avoid title case:

- "Go"
- "Line"
- "Flower"

Do not optimize for dictionary precision.

Choose the English word that best captures the central semantic idea.

### description

Briefly explain the semantic idea and how the major Branches naturally develop from it.

Focus on the semantic network.

Do not define the English lemma.

Do not refer to "this Core Meaning".

Keep it concise.

## Branch

Each Branch contains:

- "lemma"
- "description"
- "occurrences"

### lemma

Like Core Meanings, this is an English dictionary headword.

Prefer a single common English lemma whenever possible.

Use lowercase unless the word is a proper noun.

### description

Explain how this Branch develops from the parent Core Meaning.

Do not simply restate the lemma.

Do not refer to the Branch itself.

Keep it concise.

## Occurrences

Each Branch contains an "occurrences" array.

Each item is the written form of one supplied occurrence assigned to that Branch.

Requirements:

- Every supplied occurrence must appear **exactly once** across all Branches.
- Use the written word exactly as supplied in the input.
- Do not include pronunciation, pinyin, glosses, definitions, or explanations.
- Do not invent occurrences that were not supplied.

Example:

  "occurrences": [
    "步行",
    "旅行",
    "飞行"
  ]

---

<input>
{{ input }}
</input>
`;

  const data = {
    character: input.character,
    wordList: input.usages.map((usage) => `${usage.hanzi} (${usage.pinyin})`),
  };

  const messages: ChatPromptMessage[] = [
    {
      role: `system`,
      content: renderPromptTemplate(systemTemplate, {
        input: JSON.stringify(data),
      }),
    },
  ];

  return {
    messages,
    schema: characterCoreMeaningsSpecSchema,
    model: `gpt-5.6-terra`,
    reasoningEffort: `medium`,
  };
}
