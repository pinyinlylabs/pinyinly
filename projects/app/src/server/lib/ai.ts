import { getOpenAIClient } from "@/server/lib/openai/client";
import { invariant } from "@pinyinly/lib/invariant";
import type { OpenAI } from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ResponseFormatJSONSchema,
} from "openai/resources/index.mjs";
import { z } from "zod/v4";
import makeDebug from "debug";

const debug = makeDebug(`pyly:ai.ts`);

export interface ChatPromptMessage {
  role: `system` | `user` | `assistant`;
  content: string;
}

export interface ChatPrompt<Schema extends z.ZodType> {
  model: OpenAI.ChatModel;
  reasoningEffort: OpenAI.ReasoningEffort;
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
  options?: { signal?: AbortSignal; retries?: number },
): Promise<{
  data: z.infer<Schema>;
  usage?: OpenAI.CompletionUsage;
  message: ChatPromptMessage;
}> {
  const client = getOpenAIClient();

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: prompt.model,
    reasoning_effort: prompt.reasoningEffort,
    response_format: openAiZodResponseFormat(prompt.schema, `result_shape`),
    messages: prompt.messages,
  };

  for (let retries = options?.retries ?? 2; ; retries--) {
    invariant(options?.signal?.aborted !== true, `operation aborted`);

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

    let data;
    try {
      data = prompt.schema.parse(JSON.parse(content), { reportInput: true });
    } catch (e) {
      if (retries > 0) {
        debug(
          `OpenAI response did not match expected schema. Prompt: %o\n\nInput: %o:`,
          prompt,
          e,
        );
        continue;
      }
      throw e;
    }

    return {
      data,
      message: { role: message.role, content },
      usage: completion.usage,
    };
  }
}
