import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import type { MeaningHintPromptInput } from "./meaningHint";
import { meaningHintOutputSchema } from "./meaningHint";

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
        data: JSON.stringify(data),
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
