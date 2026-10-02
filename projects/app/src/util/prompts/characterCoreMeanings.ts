import { matchAllPinyinUnits } from "@/data/pinyin";
import { splitHanziText } from "@/data/hanzi";
import {
  hanziTextSchema,
  pinyinTextSchema,
  pinyinUnitSchema,
} from "@/data/model";
import type {
  characterCurriculumMeaningSchema,
  HanziCharacter,
  HanziText,
  PinyinText,
} from "@/data/model";
import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type { DeepReadonly } from "ts-essentials";
import { z } from "zod";
import isEqual from "lodash/isEqual";
import { buildHanziWord } from "@/dictionary";

export type CharacterCoreMeaningsSpecInputType = {
  character: HanziCharacter;
  usages: DeepReadonly<{ hanzi: HanziText; pinyin: PinyinText }[]>;
};

export const characterCoreMeaningsSpecPromptOutputSchema = z
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
            /**
             * Storing hanzi occurrences here wasn't the original plan (instead
             * the occurrences would be stored on the relevant words that use
             * this character), but it's actually useful to include them here to
             * give more context to the branch for how it's used.
             */
            occurrences: z.array(z.string()),
          }),
        ),
      }),
    ),
  })
  .strict()
  .meta({ title: `characterCoreMeaningsSpecSchema` });

export function buildCharacterCoreMeaningsSpecPrompt(
  input: CharacterCoreMeaningsSpecInputType,
): ChatPrompt<
  typeof characterCoreMeaningsSpecPromptOutputSchema,
  z.infer<typeof characterCurriculumMeaningSchema>[]
> {
  const systemTemplate = `
# Task

Infer the semantic curriculum for a Chinese character from the supplied vocabulary.

The goal is **not** to reproduce dictionary senses.

Instead, organize the vocabulary into the smallest set of memorable concepts that will help a student understand how the character contributes meaning across many words.

Think like a **curriculum designer**, not a dictionary editor.

## Principles

- Prefer the smallest set of Core Meanings that naturally explains the supplied vocabulary.
- A Core Meaning should represent a stable semantic idea that can be reused across many words.
- A Branch should represent a **teaching category**, not a dictionary sense.
- Prefer broad, memorable conceptual groupings over fine-grained lexical distinctions.
- Group words by the idea that best helps a student understand them, even if a dictionary would distinguish them more precisely.
- If a Branch would contain only one or two narrowly related words, consider whether it should instead be merged into a broader teaching category.
- Do not create unnecessary semantic distinctions merely because they exist in dictionaries.
- Do not merge genuinely unrelated meanings merely to reduce the number of Core Meanings.
- Every supplied occurrence must appear exactly once.
- Do not invent vocabulary that was not supplied.
- If the same written word appears multiple times with different pronunciations, treat them as separate occurrences.
- Do not include pinyin anywhere in the output except "primaryReading" and "pronunciationExceptions".

## Core Meaning

Each Core Meaning contains:

- "lemma"
- "primaryReading"
- optional "pronunciationExceptions"
- "description"
- "branches"

### lemma

"lemma" is a short English semantic anchor.

Its purpose is to give students a memorable central idea.

Prefer a single common English word.

Use lowercase unless the word is a proper noun.

Examples of formatting:

- "go"
- "line"
- "flower"
- "wood"
- "hand"

Avoid title case:

- "Go"
- "Flower"

Do not optimize for dictionary precision.

Choose the simplest English word that best captures the central semantic idea.

### pronunciationExceptions

Include the original written item exactly as supplied in the input.

### description

Briefly describe the semantic scope of the Core Meaning and the major kinds of meanings it includes.

Focus on the conceptual network rather than dictionary definitions.

Do not define the English lemma.

Do not refer to "this Core Meaning".

Keep it concise.

Bad example:

- "Movement extends to travel, operation, circulation, and conduct."

Good example:

- "Physical movement, travel, operation, circulation, feasibility, and conduct."

## Branch

Each Branch contains:

- "lemma"
- "description"
- "occurrences"

### lemma

Like Core Meanings, this is a short English semantic anchor.

Prefer a single common English word whenever possible.

Choose a **teaching concept**, not the most precise dictionary term.

Good examples:

- "travel"
- "growth"
- "energy"
- "trade"
- "shape"
- "approval"

Avoid unnecessarily specific labels when a broader concept would teach the character better.

### description

Describe the semantic scope of this Branch.

Describe the conceptual connection.

Do not simply restate the lemma.

Do not refer to "this Branch".

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

## Example of the desired level of abstraction

Prefer conceptual teaching categories:

Good:

go
- travel
  - 步行
  - 飞行
  - 航行
  - 行驶

Avoid splitting into unnecessarily fine-grained categories:

go
- walk
- fly
- sail
- drive

The purpose is to help students understand how the character's meaning expands, not to classify every lexical nuance.

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
    schema: characterCoreMeaningsSpecPromptOutputSchema,
    model: `gpt-5.6-terra`,
    reasoningEffort: `medium`,
    transform: (data) => {
      return data.coreMeanings.map((coreMeaning) => {
        const result: z.infer<typeof characterCurriculumMeaningSchema> = {
          id: buildHanziWord(input.character, coreMeaning.lemma),
          gloss: coreMeaning.lemma,
          pinyin: pinyinUnitSchema.parse(coreMeaning.primaryReading, {
            reportInput: true,
          }),
          pinyinExceptions: Object.fromEntries(
            coreMeaning.pronunciationExceptions.map((exception) => {
              const [, hanziRaw, pinyinRaw] =
                exception.match(/^(.+) \((.+)\)$/u) ?? [];
              invariant(
                hanziRaw != null && pinyinRaw != null,
                `Pronunciation exception "%s" is not in the expected format`,
                exception,
              );
              const hanzi = hanziTextSchema.parse(hanziRaw, {
                reportInput: true,
              });
              const pinyin = pinyinTextSchema.parse(pinyinRaw, {
                reportInput: true,
              });
              invariant(
                input.usages.some(
                  (usage) => usage.hanzi === hanzi && usage.pinyin === pinyin,
                ),
                `Pinyin exception %s not found in supplied usages (hanzi=%s, pinyin=%s)`,
                exception,
                hanzi,
                pinyin,
              );
              return [hanzi, pinyin];
            }),
          ),
          description: coreMeaning.description,
          branches: coreMeaning.branches.map((branch) => {
            return {
              gloss: branch.lemma,
              description: branch.description,
              occurrences: Object.fromEntries(
                branch.occurrences.map((occurrence) => {
                  const hanzi = hanziTextSchema.parse(occurrence, {
                    reportInput: true,
                  });
                  const chars = splitHanziText(hanzi);
                  invariant(
                    chars.filter((c) => c === input.character).length === 1,
                    `Occurrence %s does not contain exactly one instance of character %s`,
                    occurrence,
                    input.character,
                  );
                  const index = chars.indexOf(input.character);
                  invariant(index > -1);
                  const usageByHanzi = input.usages.filter(
                    (usage) => usage.hanzi === occurrence,
                  );
                  let pinyin;
                  invariant(
                    usageByHanzi.length > 0,
                    `Occurrence %s not found in supplied usages`,
                    occurrence,
                  );
                  if (usageByHanzi.length === 1) {
                    pinyin = nonNullable(usageByHanzi[0]).pinyin;
                  } else {
                    const exactPinyinMatch = usageByHanzi.find(
                      (usage) =>
                        matchAllPinyinUnits(usage.pinyin)[index] ===
                        coreMeaning.primaryReading,
                    );
                    if (exactPinyinMatch == null) {
                      const pinyinOptions = usageByHanzi.map(
                        (usage) => usage.pinyin,
                      );
                      throw new Error(
                        `Occurrence ${occurrence} has multiple supplied pinyin options (${pinyinOptions.join(
                          `, `,
                        )}), but none of them match the core meaning's primary reading (${coreMeaning.primaryReading}) at index ${index}`,
                      );
                    } else {
                      pinyin = exactPinyinMatch.pinyin;
                    }
                  }

                  return [occurrence, pinyin];
                }),
              ),
            };
          }),
        };

        if (isEqual(result.pinyinExceptions, {})) {
          delete result.pinyinExceptions;
        }

        return result;
      });
    },
  };
}
