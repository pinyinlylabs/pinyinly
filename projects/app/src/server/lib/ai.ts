import { getOpenAIClient } from "@/server/lib/openai/client";
import type { OpenAI } from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ResponseFormatJSONSchema,
} from "openai/resources/index.mjs";
import { z } from "zod/v4";

export interface ChatPromptMessage {
  role: `system` | `user` | `assistant`;
  content: string;
}

export interface ChatPrompt<Schema extends z.ZodType> {
  model?: OpenAI.ChatModel;
  reasoningEffort?: OpenAI.ReasoningEffort;
  messages: ChatPromptMessage[];
  /**
   * The Zod schema describing the expected shape of the assistant's response.
   * This is used for type inference and validation of the response data.
   */
  schema: Schema;
}

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
  prompt: ChatPrompt<Schema>,
  options?: { signal?: AbortSignal },
): Promise<{
  data: z.infer<Schema>;
  usage?: OpenAI.CompletionUsage;
  message: ChatPromptMessage;
}> {
  const client = getOpenAIClient();

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: prompt.model ?? `gpt-5-mini`,
    reasoning_effort: prompt.reasoningEffort ?? null,
    response_format: openAiZodResponseFormat(prompt.schema, `result_shape`),
    messages: prompt.messages,
  };

  const completion = await client.chat.completions.create(body, {
    signal: options?.signal,
  });

  const message = completion.choices[0]?.message;
  if (message == null) {
    throw new Error(`OpenAI response message was missing`);
  }

  const content = message.content ?? ``;
  if (content.length === 0) {
    throw new Error(`OpenAI response message content was empty`);
  }

  return {
    data: prompt.schema.parse(JSON.parse(content)),
    message: { role: message.role, content },
    usage: completion.usage,
  };
}
