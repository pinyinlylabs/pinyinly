import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { z } from "zod";

export type PronunciationHintPromptInput = {
  leadCharacter: { name: string; bio?: string; article?: string };
  location: { name: string; description?: string };
  cue: { word: string; meaning?: string };
  count: number;
};

const pronunciationHintOutputSchema = z
  .object({
    suggestions: z
      .array(
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
      )
      .min(1),
  })
  .strict();

function buildPronunciationHintPromptData({
  leadCharacter,
  location,
  cue,
}: Omit<PronunciationHintPromptInput, `count`>) {
  return {
    leadCharacter: {
      name: leadCharacter.name,
      ...(leadCharacter.article == null
        ? {}
        : { article: leadCharacter.article }),
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
  typeof buildPronunciationHintFantasyPrompt.schema
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
    schema: buildPronunciationHintFantasyPrompt.schema,
    model: `gpt-5-mini`,
    reasoningEffort: `medium`,
  };
}
buildPronunciationHintFantasyPrompt.strategy = `fantasy`;
buildPronunciationHintFantasyPrompt.schema = pronunciationHintOutputSchema;

export function buildPronunciationHintRealisticPrompt({
  leadCharacter,
  location,
  cue,
  count,
}: PronunciationHintPromptInput): ChatPrompt<
  typeof buildPronunciationHintRealisticPrompt.schema
> {
  const systemTemplate = `
You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
Invent clear, grounded mini-scenes using a character, a location, and a keyword.
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
Keep scenes realistic and plausible in everyday life.
Avoid supernatural, magical, dreamlike, or impossible events.
Avoid bizarre shock-value imagery; prefer practical, familiar actions.
Never include pinyin, Hanzi, IPA, tone marks, or pronunciation syllables in the ending text.
Do not mention sound, pronunciation, phonetics, letters, initials, finals, tones, or transliteration.
Only anchor the story on the lead character, the location, and the cue concept.
Good endings are concrete, replayable, mentally vivid, and believable.
Bad endings are generic, flat, fantastical, or mostly definitions.
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
    schema: buildPronunciationHintRealisticPrompt.schema,
    model: `gpt-5-mini`,
    reasoningEffort: `medium`,
  };
}
buildPronunciationHintRealisticPrompt.strategy = `realistic`;
buildPronunciationHintRealisticPrompt.schema = pronunciationHintOutputSchema;

export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template
    .trim()
    .replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gu, (_, key: string) => {
      return variables[key] ?? ``;
    });
}

export const meaningHintComponentSchema = z.object({
  hanzi: z.string().optional(),
  label: z.string().optional(),
  meaning: z.string().optional(),
});

export const meaningHintPromptInputSchema = z.object({
  hanzi: z.string(),
  meaning: z.object({
    hanziWord: z.string(),
    glosses: z.array(z.string()),
  }),
  components: z.array(meaningHintComponentSchema).optional(),
  count: z.number(),
});

export type MeaningHintPromptInput = z.infer<
  typeof meaningHintPromptInputSchema
>;

const meaningHintOutputSchema = z
  .object({
    suggestions: z
      .array(
        z
          .object({
            hint: z.string(),
            explanation: z.string().nullable(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const buildMeaningHintPrompt = ({
  hanzi,
  meaning,
  components,
  count,
}: MeaningHintPromptInput): ChatPrompt<typeof meaningHintOutputSchema> => {
  const systemTemplate = `
You're a helpful assistant that creates short meaning-recognition mnemonic hints for Mandarin learners.
Your job is to help the learner remember what a Hanzi means using its visual components.
Use the provided component details as the core building blocks of each hint.
Write vivid, concrete, and memorable mini-scenes or mental images.
Focus on meaning recall, not pronunciation.
Avoid historical or etymological claims unless directly supported by the provided component context.
Keep each hint to 1-2 sentences.
Prefer unusual but clear imagery over generic definitions.
Each suggestion should help a learner recall the target meaning from the character's components.
Do not write a plain dictionary definition.
Do not introduce pronunciation guidance.
If component context is provided, ground the hint in those components explicitly.
`;

  const data = {
    hanzi,
    meaning: {
      hanziWord: meaning.hanziWord,
      glosses: meaning.glosses,
    },
    ...(components == null
      ? {}
      : {
          components: components.map((component) => {
            return {
              ...(component.hanzi == null ? {} : { hanzi: component.hanzi }),
              ...(component.label == null ? {} : { label: component.label }),
              ...(component.meaning == null
                ? {}
                : { meaning: component.meaning }),
            };
          }),
        }),
  };

  const userTemplate = `
Generate {{ count }} distinct mnemonic hints.
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
    schema: meaningHintOutputSchema,
    model: `gpt-5.4`,
    reasoningEffort: `none`,
  };
};
buildMeaningHintPrompt.strategy = `visual`;
buildMeaningHintPrompt.schema = meaningHintOutputSchema;

export const buildMeaningHintLogicalPrompt = ({
  hanzi,
  meaning,
  components,
  count,
}: MeaningHintPromptInput): ChatPrompt<typeof meaningHintOutputSchema> => {
  const primaryGloss = meaning.glosses[0] ?? ``;
  const disambiguation = meaning.glosses.slice(1).join(`; `);

  const data = {
    targetCharacter: {
      hanzi,
      gloss: primaryGloss,
      ...(disambiguation === `` ? {} : { disambiguation }),
    },
    components: (components ?? []).map((component) => {
      return {
        ...(component.hanzi == null ? {} : { hanzi: component.hanzi }),
        ...(component.meaning == null && component.label == null
          ? {}
          : { gloss: component.meaning ?? component.label }),
      };
    }),
  };

  const systemTemplate = `
You're a helpful assistant that generates memorable mnemonic phrases for Chinese characters. Your job is to help the learner remember what a Hanzi means using just its visual components.

Rules:
- Keep mnemonics realistic, intuitive, concrete and memorable.
- Keep mnemonics short, 1-2 sentences is optimal.
- Leverage the logical connection between the components to explain the target character.
- The disambiguation values are form/meaning guidance only, do not include them directly in the hint.
- Anchor on the exact gloss values, don't use them as a base stem for derivative words.
- Only focus on meaning recall, not pronunciation.
- Avoid introducing unnecessary elements that could distract from the core elements.
- Put the hanzi after each gloss in parenthesis: <gloss> (<hanzi>)
`.trim();

  const userTemplate = `
Generate {{ count }} distinct mnemonic hints:

<data>
{{ data }}
</data>
`.trim();

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
    schema: meaningHintOutputSchema,
    model: `gpt-5.4`,
    reasoningEffort: `none`,
  };
};
buildMeaningHintLogicalPrompt.strategy = `logical`;
buildMeaningHintLogicalPrompt.schema = meaningHintOutputSchema;

export const buildMeaningHintCausualBridgePrompt = ({
  meaning,
  components,
  count,
}: MeaningHintPromptInput): ChatPrompt<typeof meaningHintOutputSchema> => {
  const primaryGloss = meaning.glosses[0] ?? ``;
  const cues = (components ?? []).flatMap((component) => {
    const cue = component.meaning ?? component.label;
    if (cue == null) {
      return [];
    }

    return [cue];
  });

  const data = {
    target: primaryGloss,
    cues,
  };

  const systemTemplate = `
You are a helpful assistant that creates short mnemonic explanations.

You will be given:
- A target: the concept the learner wants to remember.
- A list of cues: ideas the learner already knows.

Your task is to write a short explanation that uses every cue to make the target easy to remember.

Guidelines:
- Keep the explanation concise. One short sentence is preferred; use two only if necessary.
- Use plain, natural, everyday English.
- Prefer the simplest explanation that works.
- Make the target the natural consequence of the events in the explanation.
- Prefer a single, direct cause-and-effect relationship.
- Unless the cues explicitly specify another actor, use the learner (“I”) as the subject of any action.
- Avoid introducing intermediate concepts. Connect the cues to the target as directly as possible.
- Every cue should play an essential role in producing the target.
- Avoid unnecessary characters, objects, settings, or descriptive details.
- Avoid dramatic, magical, poetic, exaggerated, or theatrical language.
- Avoid introducing concepts that are not provided unless they are required for natural English.
- Avoid merely listing the concepts together. They should interact meaningfully.
- The explanation should feel obvious in hindsight, as though the cue naturally follows from the concepts.

The learner should be able to reconstruct the target simply by remembering how the cues interacted.

Generate multiple distinct ideas that use different relationships or perspectives rather than minor wording variations.
`.trim();

  const userTemplate = `
Generate {{ count }} mnemonic stories:

<data>
{{ data }}
</data>
`.trim();

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
    schema: meaningHintOutputSchema,
    model: `gpt-5.4`,
    reasoningEffort: `none`,
  };
};
buildMeaningHintCausualBridgePrompt.strategy = `casual-bridge`;
buildMeaningHintCausualBridgePrompt.schema = meaningHintOutputSchema;

export function buildSubLocationDescriptionPrompt({
  label,
  location,
  locationNotes,
  sublocation,
  viewpoint,
  count,
}: {
  label: string;
  location: string;
  locationNotes?: string;
  sublocation: string;
  viewpoint?: string;
  count: number;
}): ChatPrompt<typeof buildSubLocationDescriptionPrompt.schema> {
  const systemTemplate = `
You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
Your goal is to define a stable mental image of a place that can be reused across many stories.
You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.
Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
Each suggestion must clearly reflect both the Location and the Sublocation.
If a Viewpoint is provided, ensure the description matches that perspective.
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
    sublocation,
    ...(locationNotes == null ? {} : { locationNotes }),
    ...(viewpoint == null ? {} : { viewpoint }),
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
    schema: buildSubLocationDescriptionPrompt.schema,
    model: `gpt-5-mini`,
    reasoningEffort: `medium`,
  };
}
buildSubLocationDescriptionPrompt.schema = z
  .object({
    suggestions: z
      .array(
        z
          .object({
            description: z.string(),
            explanation: z.string().nullable(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export function buildLeadCharacterDescriptionPrompt({
  name,
  sound,
  existingDescription,
  count,
}: {
  name: string;
  sound: string;
  existingDescription?: string;
  count: number;
}): ChatPrompt<typeof buildLeadCharacterDescriptionPrompt.schema> {
  const systemTemplate = `
You're a helpful assistant that creates vivid, distinct character personalities for Mandarin pronunciation mnemonic palaces.
Your goal is to define a memorable character with a unique trait, backstory, or personality that makes them unforgettable.
Each character bio should feel distinct, specific, and reusable across many mnemonic stories.
Focus on personality quirks, memorable traits, backstory hints, or distinctive mannerisms.
Make characters feel like real people with depth—avoid generic or flat descriptions.
Keep each bio to 1-2 sentences. Make them specific, visual, and easy to remember.
Each suggestion must describe a unique, memorable personality or trait.
Each suggestion should feel like a real person with specific quirks or depth.
Each suggestion should be distinct from other suggestions.
Return only the descriptive fragment itself, don't prefix with the character name.
Be easy to visualize and reuse in different mnemonic stories.
Do not write a definition or encyclopedia-style description.
Good suggestions feel like a vivid character profile.
Bad suggestions feel generic, flat, or encyclopedia-like.
`;

  const data = {
    name,
    sound,
    ...(existingDescription == null ? {} : { existingDescription }),
  };

  const userTemplate = `
Generate {{ count }} distinct character personality descriptions for this character.

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
    schema: buildLeadCharacterDescriptionPrompt.schema,
    model: `gpt-5-mini`,
    reasoningEffort: `medium`,
  };
}
buildLeadCharacterDescriptionPrompt.schema = z
  .object({
    suggestions: z
      .array(
        z
          .object({
            description: z.string(),
            explanation: z.string().nullable(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
