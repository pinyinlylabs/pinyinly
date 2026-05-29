// pyly-not-src-test
import { createHarness } from "vitest-evals";
import type { HarnessMetadata, JsonValue } from "vitest-evals";
import type { ChatPrompt } from "#server/lib/ai.js";
import { requestOpenAiChatJson } from "#server/lib/ai.js";
import type { z } from "zod/v4";

export function createChatPromptHarness<
  TMetadata extends HarnessMetadata,
  Schema extends z.ZodType<TOutput>,
  TInput = unknown,
  TOutput extends JsonValue | undefined = z.infer<Schema>,
>(
  buildPrompt: (input: TInput) => ChatPrompt<Schema>,
  _metadataSchema?: z.ZodType<TMetadata>,
) {
  return createHarness<TInput, TOutput, TMetadata>({
    name: `chatHarness`,
    run: async ({ input, signal }) => {
      const prompt = buildPrompt(input);

      const { data, usage } = await requestOpenAiChatJson(prompt, {
        signal,
      });

      return {
        output: data,
        messages: prompt.messages,
        usage: {
          provider: `openai`,
          model: prompt.model,
          inputTokens: usage?.prompt_tokens,
          outputTokens: usage?.completion_tokens,
          reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens,
          totalTokens: usage?.total_tokens,
        },
      };
    },
  });
}
