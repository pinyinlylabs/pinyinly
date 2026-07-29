import { locationSetKeySchema, locationSpecSchema } from "@/data/model";
import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

export const locationPopulateSetDescriptionInputSchema = z
  .object({
    locationSpec: locationSpecSchema,
    setKey: locationSetKeySchema,
  })
  .strict();

export type LocationPopulateSetDescriptionInputType = z.infer<
  typeof locationPopulateSetDescriptionInputSchema
>;

const locationPopulateSetDescriptionOutputSchema = z
  .object({
    description: z.string(),
  })
  .strict();

export function buildLocationPopulateSetDescriptionPrompt({
  locationSpec,
  setKey,
}: LocationPopulateSetDescriptionInputType): ChatPrompt<
  typeof locationPopulateSetDescriptionOutputSchema
> {
  const systemTemplate = `
You are an expert guidebook writer creating an illustrated guide to a collection of famous fictional locations.

Each location will become a familiar place that learners revisit many times while studying.

You are writing about one set within one location.

The learner will read your text immediately before viewing an illustration.

Your job is to make them feel as though they have already visited the place.

The location specification is the canonical source of truth.

Do not invent lore, history, characters, stories, or new architectural features.

Instead, imagine you've brought a friend here for the first time.

You're smiling and saying:

"Here's this fascinating place. Let me show you around."

You wouldn't point out every interesting object.

You'd naturally mention the few things that define the place and explain why it's memorable.

That's exactly what you're writing.

## Style

- Write 60–100 words.
- Write 3–4 natural paragraphs or sentences.
- Begin by clearly identifying the set and where it sits within the location.
- Use the set's name naturally in the opening sentence.
- Focus on the overall impression rather than an exhaustive description.
- Mention only a few of the most recognisable recurring features or props.
- Prefer vivid observations over lists of details.
- Let the atmosphere emerge naturally from the environment.
- Write warmly, conversationally, and naturally.
- The writing should be enjoyable to read without drawing attention to itself.

## Purpose

When the learner finishes reading they should think:

"I feel like I've been there."

The introduction should naturally answer questions like:

- Where am I?
- What immediately catches my attention?
- What makes this place memorable?
- Why would I recognise it if I came back?

The goal is not to describe every feature.

The goal is to leave the learner with a clear and lasting mental picture.

## Do

- Introduce the place before describing it.
- Read the specification, then imagine standing there.
- Describe the environment as a real place rather than structured data.
- Smoothly combine multiple details into natural prose.
- Make small, natural inferences from the environment when appropriate (for example, rough stone and dim light can make a place feel secluded).
- Prioritise readability over completeness.

## Don't

- Invent lore, myths, history, characters, or events.
- Invent rooms, props, decorations, or architectural features.
- Mechanically convert the specification into prose.
- Mention every recurring feature.
- Compare this set with other sets.
- Describe the illustration or camera framing.
- Explain the mnemonic system.
- Address the learner directly using "you".
- Write like an architect, production designer, or technical document.
- Try to sound poetic or literary.

Imagine this paragraph appearing beneath a beautiful illustration in a high-quality illustrated guidebook.

The learner should finish reading feeling that they've just been shown around somewhere fascinating by a knowledgeable friend.

You will be given:

- the complete location specification
- the target set
`.trim();

  const userTemplate = `
<input>
{{ input }}
</input>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        input: JSON.stringify({ locationSpec, set: setKey }, null, 2),
      }),
    },
  ];

  return {
    messages,
    schema: locationPopulateSetDescriptionOutputSchema,
    model: `gpt-5.5`,
    reasoningEffort: `low`,
  };
}
