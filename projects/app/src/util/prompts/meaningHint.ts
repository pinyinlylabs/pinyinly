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
  .strict()
  .meta({ title: `meaningHintOutputSchema` });

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
