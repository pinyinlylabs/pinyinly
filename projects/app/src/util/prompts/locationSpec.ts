import { locationSpecSchema } from "@/data/model";
import type { LocationSpec } from "@/data/model";
import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

/**
 * A location specification is a canonical, reusable design brief for one
 * fictional location.
 */

const locationSpecWithDetailBaseSchema = locationSpecSchema
  .omit({ sets: true })
  .strict()
  .extend({
    recognitionHooks: z.array(z.string()),
    designRules: z.array(z.string()),
  });

export const locationSpecWithDetailSchema = locationSpecWithDetailBaseSchema
  .superRefine(validateLocationSpecShape)
  .meta({ title: `locationSpecWithDetailSchema` });

export interface LocationSpecWithDetail
  extends z.infer<typeof locationSpecWithDetailSchema>, LocationSpec {}

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
}

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

Before finalising, silently check:

- every rule is observable
- every rule adds a distinct idea
- redundant rules have been merged
- no lore or invented proper names were introduced
- props provide useful material for scenes without becoming mandatory clutter
- another artist could recreate essentially the same location from the specification

Generate the canonical location specification for the following input.

<input>
{{ input }}
</input>
`.trim();

  const messages: ChatPromptMessage[] = [
    {
      role: `system`,
      content: renderPromptTemplate(systemTemplate, {
        input: JSON.stringify(entry),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `medium`,
    schema: locationSpecWithDetailSchema,
  };
};
