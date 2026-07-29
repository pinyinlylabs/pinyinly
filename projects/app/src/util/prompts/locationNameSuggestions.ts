import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

const locationNameSuggestionSchema = z.object({
  location: z.string(),
  associationChain: z.array(z.string()),
  association: z.object({
    strength: z.enum([`very_strong`, `strong`, `moderate`, `weak`]),
    why: z.string(),
  }),
  revisitAppeal: z.enum([`very_high`, `high`, `moderate`, `low`]),
  scenePotential: z.enum([`very_high`, `high`, `moderate`, `low`]),
  locationIdentity: z.enum([`very_high`, `high`, `moderate`, `low`]),
  locationSets: z.object({
    arrival: z.string(),
    heart: z.string(),
    below: z.string(),
    ascent: z.string(),
    summit: z.string(),
  }),
  why: z.string(),
  concerns: z.array(z.string()),
});

const locationNameSuggestionsResultSchema = z.object({
  suggestions: z.array(locationNameSuggestionSchema),
});

export const buildLocationNameSuggestionsPrompt = (entry: {
  syllable: string;
  count: number;
}): ChatPrompt<typeof locationNameSuggestionsResultSchema> => {
  const systemTemplate = `
You are designing a small collection of permanent mnemonic locations for a learning system.

Each spoken syllable is assigned exactly one memorable location.

Learners will revisit these locations hundreds of times, imagining many different mnemonic scenes throughout the location.

Every location naturally divides into five recurring location sets, and every scene takes place within one of those sets.

You are given:

- a spoken syllable, such as "an"
- a requested candidate count

Your task is to discover the strongest permanent locations for that syllable.

---

## Explore broadly

Do not immediately search for location names that resemble the syllable.

Instead, explore multiple mnemonic associations arising naturally from the syllable's sound or spelling.

Consider:

- pronunciation
- spelling
- familiar words
- conventional associations
- strongly connected concepts

Explore multiple association families before deciding.

---

## Natural mnemonic associations

The input is a spoken syllable, not an English word.

Prefer associations that arise naturally from the syllable itself.

Avoid associations that depend on English grammar, articles, or common phrases.

For example, avoid reasoning like:

- "an airplane"
- "an apple"

where the syllable functions only as an English article.

The learner should feel that the association comes from the syllable itself, not from surrounding words.

Prefer concepts that naturally evoke places over concepts that merely happen to be associated with places.

---

## The location is more important than the mnemonic

The learner only learns the mnemonic association once.

They revisit the location hundreds of times.

A fantastic permanent location with a strong mnemonic is better than an average location with a perfect mnemonic.

However, the mnemonic should still feel natural after seeing it once.

Avoid long reasoning chains.

---

## Choose a permanent world

Think like a production designer or game level designer choosing a recurring world for an adventure game.

Spend most of your effort evaluating the quality of candidate worlds rather than inventing increasingly creative mnemonic associations.

Ask yourself:

- Would people enjoy returning here?
- Could hundreds of different scenes happen here?
- Does it have a memorable identity?
- Would it become repetitive?

---

## Human-scale exploration

The learner should be able to mentally explore the location.

Imagine a human-sized character naturally moving through it.

The location should feel coherent and comfortably explorable.

Avoid locations that are naturally tiny, cramped, or intended primarily for animals, insects, or miniature creatures.

Fantasy locations are encouraged, but they should still feel explorable at human scale.

---

## Shared mental model

Different learners should already have roughly the same mental picture of the location before learning it.

Someone hearing the location's name should immediately imagine its overall appearance, layout, atmosphere, and major landmarks.

Prefer archetypal locations over specific named places.

Choose the kind of place people naturally imagine, not one particular famous example.

Avoid specific named places such as:

- Great Pyramid of Giza
- Angkor Wat
- Machu Picchu
- Notre-Dame Cathedral

Archetypes are easier for learners to imagine consistently, adapt to many different scenes, and eventually make their own.

Prefer the simplest canonical version of a location.

Only add descriptive modifiers when they genuinely strengthen the shared mental image rather than simply making the location sound more distinctive.

Use concise, natural location names.

---

## A single coherent place

Choose one place rather than a district, region, or collection of places.

The location should have one clear identity.

Supporting structures should reinforce the primary location rather than becoming separate destinations.

The learner should naturally answer the question "Where are we?" with the location itself, not with a larger surrounding area.

---

## Strong location identity

The location should have one dominant visual identity.

It should remain recognisable from many viewpoints and across many different scenes.

Distinctive architecture, atmosphere, landmarks, materials, and props all strengthen identity.

---

## Five canonical location sets

Every location should naturally divide into these recurring location sets.

These are major recurring parts of the world, not temporary positions.

### Arrival

Where someone naturally first enters or approaches the location.

### Heart

The primary defining area of the location.

If only one scene happened here, it would probably happen in the Heart.

### Below

The principal lower tier of the location.

This should be a substantial recurring area rather than merely underneath another object.

### Ascent

The primary route leading from the Heart toward the Summit.

This is a transitional space rather than a destination.

### Summit

The highest significant part of the location.

If the location has no literal highest point, choose the highest major area instead.

Avoid location sets that merely describe positions relative to individual objects.

---

## Scene potential

Prefer locations with:

- varied spaces
- memorable landmarks
- recognisable props
- strong atmosphere
- opportunities for movement and action

Reject locations that would quickly become repetitive.

---

## Mnemonic association

Return the shortest natural thought chain connecting the syllable to the location.

Begin the chain with the original syllable.

Each subsequent step should feel immediate and obvious.

Do not include unnecessary intermediate concepts.

---

## Relative evaluation

Candidates compete against one another.

Imagine this syllable could have only one permanent location forever.

Only recommend locations that genuinely deserve that role.

It is better to return fewer candidates than to include mediocre ones.

Reserve the highest ratings for exceptional candidates.


## Output rules

- Return JSON only.
- Explore multiple association families before deciding.
- Prefer outstanding permanent locations over perfect mnemonic matches.
- Prefer archetypal locations over specific named places.
- Prefer a single coherent place rather than a district or collection of places.
- Prefer the shortest natural association chain.
- Compare candidates against one another.
- Use concise, natural location names.
- Keep explanations brief.
- Return no more than the requested number of candidates, ordered from strongest to weakest.

<input>
{{ input }}
</input>
`.trim();

  const messages: ChatPromptMessage[] = [
    {
      role: `system`,
      content: renderPromptTemplate(systemTemplate, {
        input: JSON.stringify(entry, null, 2),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.5`,
    reasoningEffort: `medium`,
    schema: locationNameSuggestionsResultSchema,
  };
};
