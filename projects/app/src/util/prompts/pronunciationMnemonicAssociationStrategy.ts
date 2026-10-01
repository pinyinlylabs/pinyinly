import type { ChatPrompt } from "@/server/lib/ai";
import {
  pronunciationMnemonicRecurringPromptAssociationStrategyKindSchema,
  pronunciationMnemonicRecurringPromptCueSchema,
} from "@/util/prompts/pronunciationMnemonicRecurring";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

export const pronunciationMnemonicAssociationStrategyPromptInputSchema =
  z.object({
    cue: pronunciationMnemonicRecurringPromptCueSchema,
  });

export type PronunciationMnemonicAssociationStrategyPromptInput = z.infer<
  typeof pronunciationMnemonicAssociationStrategyPromptInputSchema
>;

export const pronunciationMnemonicAssociationStrategyPromptOutputSchema = z
  .object({
    associationStrategy:
      pronunciationMnemonicRecurringPromptAssociationStrategyKindSchema,
    reason: z
      .string()
      .describe(
        `Briefly explain why the selected strategy's mechanism is a natural fit for representing the supplied meaning.`,
      ),
  })
  .strict()
  .meta({
    title: `pronunciationMnemonicAssociationStrategyPromptOutputSchema`,
  });

export function buildPronunciationMnemonicAssociationStrategyPrompt(
  input: PronunciationMnemonicAssociationStrategyPromptInput,
): ChatPrompt<
  typeof pronunciationMnemonicAssociationStrategyPromptOutputSchema
> {
  const systemTemplate = `
You select the best association strategy for creating a visual mnemonic.

Choose the strategy whose mechanism can most naturally and memorably represent
the supplied meaning.

Prefer a direct semantic fit over a clever or metaphorical interpretation.

The examples illustrate how each strategy works. They are not rules or
categories. Choose based on the underlying mechanism, not superficial
similarity to an example.

Do not create the mnemonic.

# Association strategies

## Identity Binding

The meaning becomes a stable, defining characteristic or identity.

Examples:
- "old" → the actor is permanently extremely old
- "teacher" → the actor is inherently a teacher
- "red" → the actor is permanently bright red

## Environment Rule

The meaning becomes a consistent rule or property of the environment.

Examples:
- "inside" → things are repeatedly forced inside other things
- "fall" → things in the environment constantly fall
- "hot" → surfaces throughout the environment are always dangerously hot

## Object Binding

The meaning is embodied by a concrete physical object.

Examples:
- "key" → a physical key
- "money" → physical cash
- "flower" → a physical flower

## Behaviour–Consequence

The meaning changes how an actor thinks, feels, chooses, or behaves.

Examples:
- "spend" → the actor compulsively spends money
- "afraid" → the actor repeatedly hides or runs away
- "forget" → the actor repeatedly forgets what they were doing

# Input

<input>
{{ input }}
</input>

# Output

Select one association strategy.

Briefly explain why its mechanism is a natural fit for representing the
meaning. Focus on the relationship between the meaning and the strategy,
rather than inventing a mnemonic.
`;

  return {
    schema: pronunciationMnemonicAssociationStrategyPromptOutputSchema,
    model: `gpt-5.4`,
    reasoningEffort: `low`,
    messages: [
      {
        role: `system`,
        content: renderPromptTemplate(systemTemplate, {
          input: JSON.stringify(input.cue),
        }),
      },
    ],
  };
}
