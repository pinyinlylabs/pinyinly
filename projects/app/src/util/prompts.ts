import { z } from "zod/v4";

export function buildPronunciationHintPrompt({
  leadCharacter,
  location,
  cue,
  creativeDirection,
  count,
}: {
  leadCharacter: { name: string; bio?: string; article?: string };
  location: { name: string; description?: string };
  cue: { word: string; meaning?: string };
  creativeDirection?: string;
  count: number;
}): { system: string; user: string } {
  const systemTemplate = `
You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
The goal is to create a scene that is easy to picture and easy to remember.
Each scene should feel like a tiny absurd sketch or striking mental snapshot.
Always clearly include the named character and location.
When a character article is provided (e.g. "the", "a"), always refer to the character with that article (e.g. "the seal") rather than as a bare proper noun.
Use the keyword as light inspiration for what happens, but do not turn the result into a definition.
When cue meaning context is provided, treat it as authoritative and use that intended sense of the cue word.
When creative direction is provided, treat it as soft guidance for tone and style while still prioritizing mnemonic clarity.
When the cue word (or a close form of it) appears in the story text, wrap it in ==word== markup (e.g. ==can== or ==canning==).
If extra character or location details are provided, use them to make the story more specific.
Keep each hint to 1-2 sentences.
Prefer visual, unusual, and memorable situations over generic ones.
Each suggestion must explicitly include the character and location by name.
Use the keyword as light inspiration for the central action, object, or conflict.
If cue meaning is provided, follow that exact sense instead of other possible meanings of the same word.
Good suggestions are specific, visual, unusual, and easy to replay mentally.
Bad suggestions are generic, flat, or mostly just a definition.
Format: wrap the cue word (or its inflected form) in ==word== whenever it appears in the story text.
`;

  const data = {
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
    ...(creativeDirection == null ? {} : { creativeDirection }),
  };

  const userTemplate = `
Generate {{ count }} distinct mnemonic story ideas.

<data>
{{ data }}
</data>
`;

  const system = renderPromptTemplate(systemTemplate, {});
  const user = renderPromptTemplate(userTemplate, {
    count: String(count),
    data: JSON.stringify(data, null, 2),
  });

  return { system, user };
}

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

export const buildMeaningHintPrompt = ({
  hanzi,
  meaning,
  components,
  count,
}: MeaningHintPromptInput): { system: string; user: string } => {
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

  const system = renderPromptTemplate(systemTemplate, {});
  const user = renderPromptTemplate(userTemplate, {
    count: String(count),
    data: JSON.stringify(data, null, 2),
  });

  return { system, user };
};
buildMeaningHintPrompt.strategy = `visual`;

export const buildMeaningHintLogicalPrompt = ({
  hanzi,
  meaning,
  components,
  count,
}: MeaningHintPromptInput): { system: string; user: string } => {
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

  const system = renderPromptTemplate(systemTemplate, {});
  const user = renderPromptTemplate(userTemplate, {
    count: String(count),
    data: JSON.stringify(data, null, 2),
  });

  return { system, user };
};
buildMeaningHintLogicalPrompt.strategy = `logical`;

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
}): { system: string; user: string } {
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

  const system = renderPromptTemplate(systemTemplate, {});
  const user = renderPromptTemplate(userTemplate, {
    count: String(count),
    data: JSON.stringify(data, null, 2),
  });

  return { system, user };
}

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
}): { system: string; user: string } {
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

  const system = renderPromptTemplate(systemTemplate, {});
  const user = renderPromptTemplate(userTemplate, {
    count: String(count),
    data: JSON.stringify(data, null, 2),
  });

  return { system, user };
}
