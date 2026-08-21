import { createHarness } from "vitest-evals";
import type {
  HarnessMetadata,
  JsonValue,
  JudgeHarnessInput,
  RunJudge,
  UsageSummary,
} from "vitest-evals";
import { requestOpenAiResponseJson } from "#server/lib/ai.js";
import type { ChatPromptLike } from "#server/lib/ai.js";
import { z } from "zod";
import { invariant } from "@pinyinly/lib/invariant";
import { jsonCodec } from "@pinyinly/lib/zod";

export async function runChatResponseJudge<
  Schema extends z.ZodType,
  Output = z.infer<Schema>,
>(runJudge: RunJudge | undefined, prompt: ChatPromptLike<Schema, Output>) {
  invariant(runJudge != null, `runJudge is required`);

  const resultText = await runJudge(chatPromptToJudgeHarnessInput(prompt));
  const parsed = jsonCodec(prompt.schema).parse(resultText, {
    reportInput: true,
  });
  return prompt.transform == null
    ? (parsed as Output)
    : prompt.transform(parsed);
}

export function chatPromptToJudgeHarnessInput<Schema extends z.ZodType>(
  prompt: ChatPromptLike<Schema, unknown>,
): JudgeHarnessInput {
  const system = prompt.messages.find((m) => m.role === `system`)?.content;
  const userMessages = prompt.messages.filter((m) => m.role === `user`) as {
    role: `user`;
    content: string;
  }[];
  const userPrompt = userMessages.map((m) => m.content).join(`\n\n`);

  return {
    system,
    prompt: userPrompt,
    responseFormat: {
      type: `json`,
      schema: z.toJSONSchema(prompt.schema, {
        unrepresentable: `throw`,
      }) as JsonValue,
    },
  };
}

export function createResponsePromptHarness<
  TMetadata extends HarnessMetadata,
  Schema extends z.ZodType<JsonValue | undefined>,
  TInput = unknown,
  TOutput extends JsonValue | undefined = z.infer<Schema>,
>(
  buildPrompt: (input: TInput) => ChatPromptLike<Schema, TOutput>,
  _metadataSchema?: z.ZodType<TMetadata>,
) {
  return createHarness<TInput, TOutput, TMetadata>({
    name: `responseHarness`,
    run: async ({ input, signal }) => {
      const prompt = buildPrompt(input);

      const response = await requestOpenAiResponseJson(prompt, {
        signal,
        // Use cheaper service tier for evals to save money.
        serviceTier: `flex`,
      });

      return {
        output: response.data,
        messages: prompt.messages,
        usage: responseUsageToUsageSummary(response),
      };
    },
  });
}

function responseUsageToUsageSummary(
  response: Awaited<ReturnType<typeof requestOpenAiResponseJson<z.ZodType>>>,
): UsageSummary {
  return {
    provider: `openai`,
    model: response.model,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    totalTokens: response.usage?.total_tokens,
    metadata: {
      usage: response.usage,
      serviceTier: response.serviceTier,
    } as unknown as Record<string, JsonValue>,
  };
}
