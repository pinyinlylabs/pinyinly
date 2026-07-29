import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import type { LocationSpec } from "@/data/model";
import { locationSpecSchema } from "@/data/model";
import { renderPromptTemplate } from "@/util/prompts/shared";
import type { LocationCriticismType } from "./locationEvaluateSpec";

export const buildLocationRefineSpecPrompt = (entry: {
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
