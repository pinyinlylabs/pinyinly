import { getOpenAIClient } from "@/server/lib/openai/client";
import { invariant } from "@pinyinly/lib/invariant";
import type { OpenAI } from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ResponseFormatJSONSchema,
} from "openai/resources/index.mjs";
import { z } from "zod";
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

export function openAiZodChatResponseFormat(
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

export function openAiZodResponseFormat(
  zodObject: z.ZodType,
  name: string,
): OpenAI.Responses.ResponseFormatTextJSONSchemaConfig {
  return {
    type: `json_schema`,
    name,
    schema: z.toJSONSchema(zodObject, { unrepresentable: `any` }),
  };
}

export async function requestOpenAiChatJson<Schema extends z.ZodType>(
  prompt: ChatPrompt<Schema>,
  options?: { signal?: AbortSignal; retries?: number },
): Promise<{
  data: z.infer<Schema>;
  usage?: OpenAI.CompletionUsage;
  message: ChatPromptMessage;
  model: string;
}> {
  const client = getOpenAIClient();

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: prompt.model,
    reasoning_effort: prompt.reasoningEffort,
    response_format: openAiZodChatResponseFormat(prompt.schema, `result_shape`),
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
      model: completion.model,
    };
  }
}

export async function requestOpenAiResponseJson<Schema extends z.ZodType>(
  prompt: ChatPrompt<Schema>,
  options?: { signal?: AbortSignal; retries?: number },
): Promise<{
  data: z.infer<Schema>;
  usage?: OpenAI.Responses.ResponseUsage;
  model: string;
}> {
  const client = getOpenAIClient();

  const body: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
    model: prompt.model,
    reasoning: {
      effort: prompt.reasoningEffort,
    },
    text: {
      format: openAiZodResponseFormat(prompt.schema, `result_shape`),
    },
    input: prompt.messages,
    store: true,
  };

  for (let retries = options?.retries ?? 2; ; retries--) {
    invariant(options?.signal?.aborted !== true, `operation aborted`);

    const response = await client.responses.create(body, {
      signal: options?.signal,
    });

    const content = response.output_text;
    if (content.length === 0) {
      throw new Error(`OpenAI response output text was empty`);
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
      usage: response.usage,
      model: response.model,
    };
  }
}
