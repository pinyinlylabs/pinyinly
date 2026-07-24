import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import type { LocationSet, LocationSpec } from "@/data/model";
import { locationSetKeySchema, locationSpecSchema } from "@/data/model";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

/**
 * A location specification is a canonical, reusable design brief for one
 * fictional location. It fixes five recurring sets in a stable order so later
 * art can reuse the same location across many illustrations. The `heart` is
 * the most memorable destination for a first-time visitor, not the
 * architectural center.
 */

export interface LocationSetWithDetail extends LocationSet {
  props: string[];
  designRules: string[];
  canonicalFraming: string;
  avoidFraming: string[];
}

export interface LocationSpecWithDetail extends LocationSpec {
  location: string;
  recognitionHooks: string[];
  designRules: string[];
  sets: {
    arrival: LocationSetWithDetail;
    heart: LocationSetWithDetail;
    below: LocationSetWithDetail;
    ascent: LocationSetWithDetail;
    summit: LocationSetWithDetail;
  };
}

const locationSetWithDetailSchema = z
  .object({
    name: z.string(),
    props: z.array(z.string()),
    designRules: z.array(z.string()),
    canonicalFraming: z.string(),
    avoidFraming: z.array(z.string()),
  })
  .strict();

const locationSpecWithDetailBaseSchema = z
  .object({
    location: z.string(),
    recognitionHooks: z.array(z.string()),
    designRules: z.array(z.string()),
    sets: z
      .object({
        arrival: locationSetWithDetailSchema,
        heart: locationSetWithDetailSchema,
        below: locationSetWithDetailSchema,
        ascent: locationSetWithDetailSchema,
        summit: locationSetWithDetailSchema,
      })
      .strict(),
  })
  .strict();

export const populateLocationSetDescriptionInputSchema = z
  .object({
    locationSpec: locationSpecSchema,
    setKey: locationSetKeySchema,
  })
  .strict();

export type PopulateLocationSetDescriptionInputType = z.infer<
  typeof populateLocationSetDescriptionInputSchema
>;

function validateLocationSpecShape(
  value: z.infer<typeof locationSpecWithDetailBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  if (value.recognitionHooks.length < 3 || value.recognitionHooks.length > 5) {
    ctx.addIssue({
      code: `custom`,
      path: [`recognitionHooks`],
      message: `Expected 3 to 5 recognition hooks.`,
    });
  }

  if (value.designRules.length === 0) {
    ctx.addIssue({
      code: `custom`,
      path: [`designRules`],
      message: `Expected at least one global design rule.`,
    });
  }

  for (const role of locationSetKeySchema.options) {
    const set = value.sets[role];

    if (set.designRules.length === 0) {
      ctx.addIssue({
        code: `custom`,
        path: [`sets`, role, `designRules`],
        message: `Expected at least one design rule for set ${role}.`,
      });
    }
  }
}

export const locationSpecWithDetailSchema =
  locationSpecWithDetailBaseSchema.superRefine(validateLocationSpecShape);

export type LocationSpecWithDetailSchemaType = z.infer<
  typeof locationSpecWithDetailSchema
>;

export const locationCriticismCodeSchema = z.enum([
  `NON_CANONICAL`,
  `INVENTED_LORE`,
  `AWKWARD_SET`,
  `WEAK_HEART`,
  `WEAK_RECOGNITION_HOOK`,
  `REDUNDANT_RULE`,
  `UNOBSERVABLE_RULE`,
  `OVER_SPECIFIC`,
  `WEAK_DISTINCTIVENESS`,
  `WEAK_COHERENCE`,
  `WEAK_FRAMING`,
  `LOW_GUEST_APPEAL`,
  `OTHER`,
]);

export type LocationCriticismCode = z.infer<typeof locationCriticismCodeSchema>;

export const locationCriticismScopeSchema = z.enum([
  `location`,
  `recognitionHooks`,
  `designRules`,
  `arrival`,
  `heart`,
  `below`,
  `ascent`,
  `summit`,
]);

export type LocationCriticismScope = z.infer<
  typeof locationCriticismScopeSchema
>;

export const locationCriticismSchema = z
  .object({
    code: locationCriticismCodeSchema,
    scope: locationCriticismScopeSchema,
    severity: z.enum([`minor`, `major`]),
    message: z.string(),
    recommendation: z.string(),
  })
  .strict();

export type LocationCriticismType = z.infer<typeof locationCriticismSchema>;

export const locationEvaluationSchema = z
  .object({
    passed: z.boolean(),
    score: z.number().min(0).max(1),
    criticisms: z.array(locationCriticismSchema),
  })
  .strict();

export type LocationEvaluationType = z.infer<typeof locationEvaluationSchema>;

export const locationSpecRefinementAttemptSchema = z
  .object({
    attempt: z.number().int(),
    locationSpec: locationSpecWithDetailSchema,
    evaluation: locationEvaluationSchema,
  })
  .strict();

export type LocationSpecRefinementAttemptType = z.infer<
  typeof locationSpecRefinementAttemptSchema
>;

export const locationSpecRefinementStopReasonSchema = z.enum([
  `no_major_criticisms`,
  `max_attempts_reached`,
]);

export type LocationSpecRefinementStopReasonType = z.infer<
  typeof locationSpecRefinementStopReasonSchema
>;

export const locationSpecRefinementResultSchema = z
  .object({
    attempts: z.array(locationSpecRefinementAttemptSchema),
    succeeded: z.boolean(),
    stopReason: locationSpecRefinementStopReasonSchema,
    finalLocationSpec: locationSpecWithDetailSchema,
    finalEvaluation: locationEvaluationSchema,
  })
  .strict();

export type LocationSpecRefinementResultType = z.infer<
  typeof locationSpecRefinementResultSchema
>;

export function buildLocationSetDescriptionPrompt({
  label,
  location,
  locationNotes,
  locationSet,
  count,
}: {
  label: string;
  location: string;
  locationNotes?: string;
  locationSet: string;
  count: number;
}): ChatPrompt<typeof buildLocationSetDescriptionPrompt.schema> {
  const systemTemplate = `
You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
Your goal is to define a stable mental image of a place that can be reused across many stories.
You will be given a primary location and a location set within or around it. Combine them into one clear, vivid, always-true mental setting.
Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
Each suggestion must clearly reflect both the Location and the Location Set.
Describe stable, always-true aspects of the place.
Return only the descriptive fragment itself, don't prefix with the place label.
Avoid time of day, weather, or temporary events.
Avoid actions or specific story moments.
Be easy to visualize and reuse in different mnemonic scenes.
Good suggestions feel like a reusable mental stage.
Bad suggestions feel like a one-time scene.
`;

  const data = {
    label,
    location,
    locationSet,
    ...(locationNotes == null ? {} : { locationNotes }),
  };

  const userTemplate = `
Generate {{ count }} distinct reusable location descriptions for this exact combined place.

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
    schema: buildLocationSetDescriptionPrompt.schema,
    model: `gpt-5-mini`,
    reasoningEffort: `medium`,
  };
}

const locationSetDescriptionOutputSchema = z
  .object({
    suggestions: z.array(
      z
        .object({
          description: z.string(),
          explanation: z.string().nullable(),
        })
        .strict(),
    ),
  })
  .strict();

buildLocationSetDescriptionPrompt.schema = locationSetDescriptionOutputSchema;

const populateLocationSetDescriptionOutputSchema = z
  .object({
    description: z.string(),
  })
  .strict();

export function buildPopulateLocationSetDescriptionPrompt({
  locationSpec,
  setKey,
}: PopulateLocationSetDescriptionInputType): ChatPrompt<
  typeof buildPopulateLocationSetDescriptionPrompt.schema
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
    schema: buildPopulateLocationSetDescriptionPrompt.schema,
    model: `gpt-5.5`,
    reasoningEffort: `low`,
  };
}

buildPopulateLocationSetDescriptionPrompt.schema =
  populateLocationSetDescriptionOutputSchema;

export const buildLocationSpecPrompt = (entry: {
  location: string;
}): ChatPrompt<typeof locationSpecWithDetailSchema> => {
  const systemTemplate = `
You are an expert production designer creating the canonical design specification for a recurring fictional location.

This specification will be used by artists and image-generation models to create hundreds of illustrations over many years.

Your goal is not to design a unique location or describe a single illustration.

Your goal is to define the version of the location that already exists in people's shared imagination.

Future illustrations should feel like different visits to the same location.

Whenever originality and recognisability disagree, choose recognisability.

Whenever realism and recognisability disagree, choose recognisability.

Do not invent lore, history, proper nouns, named landmarks, or backstory.

Prefer timeless, widely recognised interpretations over clever or unusual ones.

## Recognition hooks

List the 3–5 strongest recurring visual ideas that instantly identify the location.

Hooks should be simple iconic objects, landmarks, silhouettes, or architectural features.

Keep each hook to only a few words.

Hooks should remain meaningful across different artistic styles.

## Global design rules

Write concise recurring visual rules that preserve the identity of the location.

Every rule must describe something directly observable in an illustration.

Prefer visual outcomes over implementation details or abstract intentions.

Prefer large recurring ideas over small decorative details.

Every rule should introduce one new visual idea.

Merge redundant rules.

Avoid unnecessary specificity.

## Canonical sets

Every location has exactly five recurring sets.

The five sets should form a coherent traversal through the location.

Each set should be a persistent and recognisable part of the location itself, not merely somewhere nearby or a route used to reach it.

Prefer spaces that are inside the location or inseparably connected to it over surrounding landscape, roads, parking areas, or unrelated approach routes.

### Arrival

Where visitors first enter or reach the location itself.

Choose a recognisable threshold, entrance area, gate, doorway, platform, dock, or immediately adjoining space.

Do not choose a distant approach route when a stronger entrance space exists.

### Heart

The highlight of visiting the location.

Imagine giving a first-time visitor a tour.

If you could show them only one destination before they had to leave, where would you take them?

Choose the destination visitors are most excited to reach and most enjoy remembering.

Do not choose a circulation hub merely because it connects the rest of the environment or provides the best overview.

Choose the destination, not the hub.

### Below

The canonical lower part of the location.

Choose a distinct lower destination rather than merely another corridor, stairway, or transitional route.

Prefer a memorable room, chamber, level, enclosed area, hidden space, or environmental feature that clearly differs from the Ascent.

### Ascent

The canonical route upward within the location.

Prefer staircases, ramps, catwalks, ladders, elevators, escalators, or other persistent architectural features that connect the lower parts of the location to its highest destination.

Do not choose an exterior approach unless the ascent itself is one of the location's defining and most recognisable features.

The Ascent should read primarily as movement upward, while the Below should read as a destination.

### Summit

The highest significant destination and the natural reward for completing the ascent.

## Set specification

For each set:

- use the simplest widely recognised name
- write concise observable design rules
- list 4–8 iconic props
- define a canonical framing
- list viewpoints that weaken recognition

## Props

Props are the recurring visual vocabulary available within a set.

A prop may be:

- a movable object
- a fixed architectural feature
- a mechanism
- a fixture
- a terrain feature
- an environmental element
- a decorative object with strong mnemonic value

Choose props that make the set easier to recognise, imagine, and use in memorable scenes.

Prefer objects or features that an actor could notice, touch, carry, climb, activate, break, avoid, hide behind, or otherwise interact with.

Props should be concrete and visually distinct.

Prefer iconic, widely associated elements over generic clutter.

Good props reinforce the identity of the particular set, not merely the overall location.

Do not list vague qualities such as darkness, danger, grandeur, age, mystery, or atmosphere as props.

Do not list interchangeable background clutter unless it meaningfully supports recognition.

Props are optional recurring ingredients, not a checklist. An illustration may use only the subset most useful for that scene.

Avoid making every prop mandatory in every illustration.

## Canonical framing

The canonical framing should state:

- where the viewer stands
- what they look toward
- what dominates the composition
- which recognition hooks should remain visible when naturally possible
- which set-specific props should remain visible when they strengthen recognition

Before finalising, silently check:

- every rule is observable
- every rule adds a distinct idea
- redundant rules have been merged
- no lore or invented proper names were introduced
- each set is a natural fit for the supplied location
- the five sets form a coherent traversal
- the Below and Ascent are visually and functionally distinct
- the Heart is genuinely the highlight of visiting the location
- each prop is concrete, visually useful, and associated with its set
- props provide useful material for scenes without becoming mandatory clutter
- another artist could recreate essentially the same location from the specification
`.trim();

  const userTemplate = `
Generate the canonical location specification for the following input.

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
    model: `gpt-5.5`,
    reasoningEffort: `medium`,
    schema: locationSpecWithDetailSchema,
  };
};

export const buildEvaluateLocationSpecPrompt = (entry: {
  location: string;
  locationSpec: LocationSpec;
}): ChatPrompt<typeof locationEvaluationSchema> => {
  const systemTemplate = `
You are evaluating a location specification for a recurring fictional location.

Your task is to diagnose problems in the specification.

Do not rewrite it.

Do not improve it.

You are judging whether the specification is canonical, reusable, visually coherent, and useful for repeated illustration.

## Canonicality

Check whether the output represents the shared, default mental image of the supplied location.

Reject invented lore, proper nouns, overly specialised variants, and arbitrary distinguishing details.

Names should be simple and widely recognised.

## Natural set selection

Check whether each set naturally exists within the location.

Reject contrived sets that only exist to satisfy the schema.

The Heart must be the highlight visitors would most want to reach, not a courtyard, corridor, circulation hub, or overview chosen for architectural convenience.

The Ascent should naturally lead toward the Summit.

The Below set must be meaningfully distinct from the others.

## Recognition

Check whether there are 3–5 strong recognition hooks.

Hooks should be iconic, concise, visual, and useful across different art styles.

Reject hooks that depend on arbitrary colours, materials, moods, or implementation details.

Global and set-level rules should preserve recognisability.

## Distinctiveness and coherence

Check whether the five sets are visually and spatially distinct while still belonging to the same location.

Repeated scenes should be easy to distinguish by set.

Canonical framings should provide stable, recognisable compositions.

## Rule quality

Every design rule must be directly observable.

Rules should be concise and non-redundant.

Reject abstract intentions, overly specific details, and repeated global rules in individual sets.

## Guest appeal and revisitability

The location should be enjoyable to imagine revisiting.

The Heart should have strong appeal, wonder, and story potential.

Technically correct but boring or unrewarding sets should be criticised.

The Summit should feel like a satisfying payoff after the Ascent.

## Framing quality

Each canonical framing should clearly define viewpoint, direction, dominant composition, and relevant hooks.

Avoid impossible visibility or frames that force unrelated exterior hooks into enclosed interior spaces.

Return structured criticisms only.
`.trim();

  const userTemplate = `
Evaluate the following location specification.

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
    model: `gpt-5.5`,
    reasoningEffort: `medium`,
    schema: locationEvaluationSchema,
  };
};

export const buildRefineLocationSpecPrompt = (entry: {
  location: string;
  locationSpec: LocationSpec;
  criticisms: LocationCriticismType[];
}): ChatPrompt<typeof locationSpecSchema> => {
  const systemTemplate = `
You revise location specifications based on evaluator criticisms.

You are given:

- the original location,
- the current location specification,
- a list of criticisms.

Return one revised location specification that resolves as many criticisms as possible while preserving the strongest existing parts.

Rules:

- Keep the supplied location unchanged.
- Preserve the five required sets and their fixed order.
- Do not add new fields.
- Do not invent lore, proper nouns, or backstory.
- Use the simplest widely recognised names.
- Keep the recognition hooks compact and iconic.
- Keep design rules observable and non-redundant.

Fixes should be targeted.

If a criticism says a set choice is weak, replace the set choice rather than merely editing its wording.

If a criticism says a design rule is weak, improve the rule without redesigning the whole set.

If a criticism says framing is weak, fix the framing without changing the set itself.

If a criticism says rules are redundant or overly specific, prune them.

Do not include analysis.

Return only the revised location specification.
`.trim();

  const userTemplate = `
Revise the following location specification based on the criticisms.

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
    model: `gpt-5.5`,
    reasoningEffort: `low`,
    schema: locationSpecSchema,
  };
};

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

export function hasMajorCriticisms(
  evaluation: LocationEvaluationType,
): boolean {
  return evaluation.criticisms.some(
    (criticism) => criticism.severity === `major`,
  );
}

export function isFundamentalFailure(
  evaluation: LocationEvaluationType,
): boolean {
  return evaluation.criticisms.some(
    (criticism) =>
      criticism.severity === `major` && criticism.scope === `location`,
  );
}

export function updateBestAttempt(
  bestAttempt: LocationSpecRefinementAttemptType | null,
  currentAttempt: LocationSpecRefinementAttemptType,
): LocationSpecRefinementAttemptType {
  if (bestAttempt == null) {
    return currentAttempt;
  }

  if (currentAttempt.evaluation.score >= bestAttempt.evaluation.score) {
    return currentAttempt;
  }

  return bestAttempt;
}
