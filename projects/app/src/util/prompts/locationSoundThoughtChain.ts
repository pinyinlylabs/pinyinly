import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { locationSoundThoughtChainPromptOutputSchema } from "@/util/locationSoundThoughtChain";
import type { LocationSoundThoughtChainPromptOutputType } from "@/util/locationSoundThoughtChain";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

export const locationSoundThoughtChainPromptInputSchema = z
  .object({
    syllable: z.string(),
    pronunciationHint: z.string().optional(),
    location: z.string(),
  })
  .strict();

export type LocationSoundThoughtChainPromptInputType = z.infer<
  typeof locationSoundThoughtChainPromptInputSchema
>;

export { locationSoundThoughtChainPromptOutputSchema };

export type { LocationSoundThoughtChainPromptOutputType };

export function buildLocationSoundThoughtChain(
  entry: LocationSoundThoughtChainPromptInputType,
): ChatPrompt<typeof locationSoundThoughtChainPromptOutputSchema> {
  const systemTemplate = `
You are an expert mnemonic designer.

Your task is to discover memorable associations between a short syllable and a location.

The goal is to help an English-speaking learner remember the pronunciation of the syllable by mentally travelling through one memorable anchor to the location.

This is a creative mnemonic task, not a phonetics task.

A slightly imperfect pronunciation match is often preferable if it creates a much stronger, more memorable mnemonic.

## Principles

Think creatively before answering.

Internally explore many possible anchors before deciding which ones to present.

Do not simply return the first ideas that come to mind.

Reject weak, repetitive, or over-complicated ideas.

Prefer memorable over technically precise.

The pronunciation hint exists only to guide your search. Do not optimise purely for phonetic accuracy.

## Visible path

The learner initially sees only:

Syllable -> Anchor -> Location

The hidden reasons are not shown initially.

Therefore the anchor must largely explain itself.

Someone reading only the three visible labels should be able to understand why the anchor was chosen.

Do not rely on the hidden reason to introduce the important mnemonic. The anchor itself should contain the memorable word, phrase, or idea that creates the association.

## Anchor selection

Prefer anchors that are concrete, visual, and easy to imagine.

Strong anchors are typically:

- distinctive physical objects
- animals
- fictional characters
- mythical creatures
- vehicles
- tools
- foods
- familiar activities
- memorable visual scenes

Fictional characters and legendary figures are excellent anchors when they are widely recognised.

Avoid using:

- real people
- celebrities
- historical figures
- companies
- brands
- obscure places
- obscure cultural references

unless there is an overwhelming mnemonic advantage.

The anchor should ideally become a recurring prop, object, character, or visual motif that naturally belongs inside illustrations of the supplied location.

Prefer existing words and well-known names. Avoid inventing new spellings, puns, or modified words unless they produce an exceptionally strong mnemonic.

## Strong anchors

The strongest anchors:

- immediately suggest the pronunciation
- naturally belong in, appear in, or strongly evoke the supplied location
- create a vivid mental image
- are enjoyable to imagine
- require very little explanation
- feel satisfying rather than forced
- work well as recurring visual elements inside future illustrations
- remain understandable even when viewed without their hidden reasoning

When choosing between similarly strong candidates, prefer the one that would produce the more memorable illustration.

## Diversity

Return genuinely different ideas.

Do not return multiple variations of the same anchor.

Explore different categories of anchors instead of repeatedly choosing the same type.

## Scoring

After generating all candidates, compare them against one another.

Assign scores relative to the other candidates.

Use the full scoring range.

Do not inflate scores.

It is perfectly acceptable for every candidate to receive a mediocre score if no particularly strong association exists.

## Output

Return up to 5 candidates ordered from strongest to weakest.

## Input

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    {
      role: `system`,
      content: renderPromptTemplate(systemTemplate, {
        data: JSON.stringify(entry),
      }),
    },
  ];

  return {
    messages,
    schema: locationSoundThoughtChainPromptOutputSchema,
    model: `gpt-5.4-mini`,
    reasoningEffort: `low`,
  };
}
