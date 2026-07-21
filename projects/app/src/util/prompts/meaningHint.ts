import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

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

export const meaningHintOutputSchema = z
  .object({
    suggestions: z.array(
      z
        .object({
          hint: z.string(),
          explanation: z.string().nullable(),
        })
        .strict(),
    ),
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
- Unless the cues explicitly specify another actor, use the learner ("I") as the subject of any action.
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
