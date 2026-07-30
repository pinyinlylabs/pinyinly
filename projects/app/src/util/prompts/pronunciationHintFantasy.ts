import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

export type PronunciationHintPromptInput = {
  leadCharacter: { name: string; bio?: string };
  location: { name: string; description?: string };
  cue: { word: string; meaning?: string };
  count: number;
};

export const pronunciationHintOutputSchema = z
  .object({
    suggestions: z.array(
      z
        .object({
          hint: z
            .string()
            .describe(
              `A short story ending that continues a shared setup shown separately in the UI. When the cue word appears, wrap it in ==word== (e.g. ==can==) so it renders highlighted.`,
            ),
          explanation: z.string().nullable(),
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: `pronunciationHintOutputSchema` });

function buildPronunciationHintPromptData({
  leadCharacter,
  location,
  cue,
}: Omit<PronunciationHintPromptInput, `count`>) {
  return {
    leadCharacter: {
      name: leadCharacter.name,
      ...(leadCharacter.bio == null ? {} : { bio: leadCharacter.bio }),
    },
    location: {
      name: location.name,
      ...(location.description == null
        ? {}
        : { description: location.description }),
    },
    cue: {
      word: cue.word,
      ...(cue.meaning == null ? {} : { meaning: cue.meaning }),
    },
  };
}

export function buildPronunciationHintFantasyPrompt({
  leadCharacter,
  location,
  cue,
  count,
}: PronunciationHintPromptInput): ChatPrompt<
  typeof pronunciationHintOutputSchema
> {
  const systemTemplate = `
You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
The UI shows a shared story setup separately (for example: "In [location], [character] is...").
Return only ending-style continuations that naturally finish that setup.
Do not repeat the setup phrase, and do not restate the character or location names in every ending unless essential for clarity.
Do not prefix endings with ellipsis or sentence-starter punctuation.
Write each ending as a sentence continuation fragment that can follow the setup directly.
Write endings as participle-led continuations (for example: "watering...", "tossing...", "building...").
Do not include a subject or auxiliary at the start (avoid "it is...", "the character is...", or starting with just "is...").
Start with lowercase when grammatically possible (unless a proper noun must be capitalized).
Keep each ending to 1 short sentence (2 at most when necessary).
Start endings with a vivid action or concrete object phrase, not pronouns like "it", "he", "she", or "they".
Vary the opening words across suggestions; avoid repeating the same starter pattern.
Use the keyword as light inspiration for the central action, object, or conflict, but do not turn the result into a definition.
If cue meaning context is provided, follow that exact sense instead of other possible senses.
If extra character or location details are provided, use them to make endings more specific.
Prefer visual, unusual, and memorable situations over generic ones.
Lean into imaginative, playful, and cinematic moments.
Surprising details are welcome when they remain easy to picture.
Never include pinyin, Hanzi, IPA, tone marks, or pronunciation syllables in the ending text.
Do not mention sound, pronunciation, phonetics, letters, initials, finals, tones, or transliteration.
Only anchor the story on the lead character, the location, and the cue concept.
Good endings are concrete, replayable, and mentally vivid.
Bad endings are generic, flat, or mostly definitions.
When the cue word (or a close form of it) appears in the ending text, wrap it in ==word== markup (e.g. ==can== or ==canning==).
`;

  const data = buildPronunciationHintPromptData({
    leadCharacter,
    location,
    cue,
  });

  const userTemplate = `
Generate {{ count }} distinct mnemonic story ideas.

<data>
{{ data }}
</data>
`;

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        count: String(count),
        data: JSON.stringify(data, null, 2),
      }),
    },
  ];

  return {
    messages,
    schema: pronunciationHintOutputSchema,
    model: `gpt-5-mini`,
    reasoningEffort: `medium`,
  };
}
buildPronunciationHintFantasyPrompt.strategy = `fantasy`;
