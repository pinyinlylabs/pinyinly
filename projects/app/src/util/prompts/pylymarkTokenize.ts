import type { ChatPrompt } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

export const pylymarkTokenizeInputSchema = z.object({
  text: z.string(),
  references: z.array(
    z.object({ reference: z.string(), terms: z.array(z.string()) }),
  ),
});

export type pylymarkTokenizeInput = z.infer<typeof pylymarkTokenizeInputSchema>;

export const pylymarkTokenizeOutputSchema = z
  .object({
    text: z.string(),
  })
  .meta({ title: `pylymarkTokenizeOutputSchema` });

export function buildPylymarkTokenizePrompt(
  input: pylymarkTokenizeInput,
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
    { "reference": "bi-", "terms": ["Bigfoot"] },
    { "reference": "-ao", "terms": ["barn"] },
    { "reference": "3", "terms": ["basement"] },
    { "reference": "表", "terms": ["to express"] }
  ]
}

Output:

{
  "text": "[bi- Bigfoot] hides in the [-ao barn] [3 basement] and [表 expresses] himself."
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

  return {
    schema: pylymarkTokenizeOutputSchema,
    model: `gpt-5.4`,
    reasoningEffort: `none`,
    messages: [
      {
        role: `system`,
        content: renderPromptTemplate(systemTemplate, {
          input: JSON.stringify(input),
        }),
      },
    ],
  };
}
