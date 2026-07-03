// pyly-not-src-test
import { createHarness } from "vitest-evals";
import type { HarnessMetadata, JsonValue } from "vitest-evals";
import { requestOpenAiResponseJson } from "#server/lib/ai.js";
import type { ChatPrompt } from "#server/lib/ai.js";
import type { z } from "zod";

export function createResponsePromptHarness<
  TMetadata extends HarnessMetadata,
  Schema extends z.ZodType<TOutput>,
  TInput = unknown,
  TOutput extends JsonValue | undefined = z.infer<Schema>,
>(
  buildPrompt: (input: TInput) => ChatPrompt<Schema>,
  _metadataSchema?: z.ZodType<TMetadata>,
) {
  return createHarness<TInput, TOutput, TMetadata>({
    name: `responseHarness`,
    run: async ({ input, signal }) => {
      const prompt = buildPrompt(input);

      const { data, model, usage } = await requestOpenAiResponseJson(prompt, {
        signal,
      });

      return {
        output: data,
        messages: prompt.messages,
        usage: {
          provider: `openai`,
          model: model,
          inputTokens: usage?.input_tokens,
          outputTokens: usage?.output_tokens,
          totalTokens: usage?.total_tokens,
        },
      };
    },
  });
}
