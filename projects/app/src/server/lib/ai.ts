import { getOpenAIClient } from "@/server/lib/openai/client";
import type { OpenAI } from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ResponseFormatJSONSchema,
} from "openai/resources/index.mjs";
import { z } from "zod/v4";

export function openAiZodResponseFormat(
  zodObject: z.ZodType,
  name: string,
): ResponseFormatJSONSchema {
  return {
    type: `json_schema`,
    json_schema: {
      schema: z.toJSONSchema(zodObject, { unrepresentable: `any` }),
      name,
    },
  };
}

export async function requestOpenAiChatJson<Schema extends z.ZodType>(
  prompt: {
    model?: OpenAI.ChatModel;
    reasoningEffort?: OpenAI.ReasoningEffort;
    system: string;
    user: string;
    schema: Schema;
  },
  options?: { signal?: AbortSignal },
): Promise<{ result: z.infer<Schema>; usage?: OpenAI.CompletionUsage }> {
  const client = getOpenAIClient();

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: prompt.model ?? `gpt-5-mini`,
    reasoning_effort: prompt.reasoningEffort ?? null,
    response_format: openAiZodResponseFormat(prompt.schema, `result_shape`),
    messages: [
      { role: `system`, content: prompt.system },
      { role: `user`, content: prompt.user },
    ],
  };

  const completion = await client.chat.completions.create(body, {
    signal: options?.signal,
  });

  const message = completion.choices[0]?.message;
  const content = message?.content ?? ``;

  if (content.length === 0) {
    throw new Error(`OpenAI response was empty`);
  }

  return {
    result: prompt.schema.parse(JSON.parse(content)),
    usage: completion.usage,
  };
}
