import { createHarness, createJudgeHarness } from "vitest-evals";
import type {
  HarnessMetadata,
  HarnessRun,
  JsonValue,
  JudgeHarness,
  JudgeHarnessInput,
  RunJudge,
  UsageSummary,
} from "vitest-evals";
import { requestOpenAiResponseJson } from "#server/lib/ai.js";
import type { ChatPrompt } from "#server/lib/ai.js";
import { z } from "zod";
import { getOpenAIClient } from "#server/lib/openai/client.js";
import type { OpenAI } from "openai";
import { invariant } from "@pinyinly/lib/invariant";
import { jsonCodec } from "@pinyinly/lib/zod";

export async function runChatResponseJudge<Schema extends z.ZodType>(
  runJudge: RunJudge | undefined,
  prompt: ChatPrompt<Schema>,
) {
  invariant(runJudge != null, `runJudge is required`);

  const resultText = await runJudge(chatPromptToJudgeHarnessInput(prompt));
  return jsonCodec(prompt.schema).parse(resultText, {
    reportInput: true,
  }) as z.infer<Schema>;
}

export function chatPromptToJudgeHarnessInput(
  prompt: ChatPrompt<z.ZodType>,
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

export function createChatPromptJudgeHarness(opts: {
  model: OpenAI.ResponsesModel;
  reasoningEffort: OpenAI.ReasoningEffort;
}): JudgeHarness {
  return createJudgeHarness({
    run: async (input, ctx): Promise<HarnessRun> => {
      const client = getOpenAIClient();

      const messages: { role: `system` | `user`; content: string }[] = [];
      if (input.system != null) {
        messages.push({ role: `system`, content: input.system });
      }
      messages.push({ role: `user`, content: input.prompt });

      const body: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
        model: opts.model,
        reasoning: {
          effort: opts.reasoningEffort,
        },
        input: messages,
      };

      if (input.responseFormat?.type === `json`) {
        invariant(
          input.responseFormat.schema != null,
          `responseFormat.schema is required for JSON response format`,
        );
        body.text = {
          format: {
            type: `json_schema`,
            name: `result_shape`,
            schema: input.responseFormat
              .schema as OpenAI.Responses.ResponseFormatTextJSONSchemaConfig[`schema`],
          },
        };
      }

      const response = await client.responses.create(body, {
        signal: ctx.signal,
      });

      const content = response.output_text;
      if (content.length === 0) {
        throw new Error(`OpenAI response output text was empty`);
      }

      return {
        session: {
          messages: messages,
        },
        errors: [],
        output: content,
        usage: responseUsageToUsageSummary(response),
      };
    },
  });
}

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

      const response = await requestOpenAiResponseJson(prompt, {
        signal,
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
  response: Pick<OpenAI.Responses.Response, `model` | `usage`>,
): UsageSummary {
  return {
    provider: `openai`,
    model: response.model,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    totalTokens: response.usage?.total_tokens,
  };
}
