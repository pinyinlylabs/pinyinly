import type { ChatPrompt } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { invariant } from "@pinyinly/lib/invariant";
import { z } from "zod";

export const pylymarkTokenizeInputSchema = z.object({
  text: z.string(),
  references: z.array(
    z.object({ reference: z.string(), terms: z.array(z.string()) }),
  ),
});

export type PylymarkTokenizeInput = z.infer<typeof pylymarkTokenizeInputSchema>;

export const pylymarkTokenizeOutputSchema = z
  .object({
    text: z.string(),
  })
  .meta({ title: `pylymarkTokenizeOutputSchema` });

export function buildPylymarkTokenizePrompt(
  input: PylymarkTokenizeInput,
): ChatPrompt<typeof pylymarkTokenizeOutputSchema> {
  const systemTemplate = `
You are annotating text by inserting inline reference markers.

You will be given:

- 'text': the original text.
- 'references': a list of references. Each reference has:
  - 'reference': the identifier to insert.
  - 'terms': one or more terms that may appear in the text.

Wrap the best occurrence of each reference like this:

[<reference> <matched text>]

For example:

Input:

{
  "text": "Bigfoot hides in the barn basement and expresses himself.",
  "references": [
    { "id": "0", "terms": ["Bigfoot"] },
    { "id": "1", "terms": ["barn"] },
    { "id": "2", "terms": ["basement"] },
    { "id": "3", "terms": ["to express"] }
  ]
}

Output:

{
  "text": "[0 Bigfoot] hides in the [1 barn] [2 basement] and [3 expresses] himself."
}

Rules:

- Do not rewrite the text.
- The output must be identical to the input except for inserting the reference markers.
- Match exact terms or obvious grammatical inflections (for example 'to express' → 'express', 'expresses', 'expressed', 'expressing').
- Do not match paraphrases or related words (for example 'expression' is not a match for 'express').
- Mark only the smallest matching span (for example 'expresses', not 'expresses himself').
- Mark at most one occurrence for each reference.
- Return only the annotated text.

<input>
{{ input }}
</input>
`;

  const referencesWithIds = input.references.map((ref, index) => ({
    ...ref,
    id: index.toString(),
  }));

  return {
    schema: pylymarkTokenizeOutputSchema,
    model: `gpt-5.4`,
    reasoningEffort: `none`,
    postprocess: (data) => {
      return {
        text: data.text.replaceAll(/\[(\d+) /gu, (_, id) => {
          const reference = referencesWithIds.find(
            (ref) => ref.id === id,
          )?.reference;
          invariant(reference != null, `Reference with id %s not found`, id);
          return `[${reference} `;
        }),
      };
    },
    messages: [
      {
        role: `system`,
        content: renderPromptTemplate(systemTemplate, {
          input: JSON.stringify({
            text: input.text,
            // Using numerical IDs for the references instead of arbitrary
            // strings like "-an" or "表" gets more consistent results from the
            // LLM.
            references: referencesWithIds.map(({ id, terms }) => ({
              id,
              terms,
            })),
          }),
        }),
      },
    ],
  };
}
