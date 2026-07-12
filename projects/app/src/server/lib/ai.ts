import { getOpenAIClient } from "@/server/lib/openai/client";
import { invariant } from "@pinyinly/lib/invariant";
import type { OpenAI } from "openai";
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

const unsupportedOpenAiJsonSchemaKeywords = new Set([`maxItems`, `minItems`]);

function formatJsonSchemaPath(path: readonly (number | string)[]): string {
  let result = `$`;

  for (const part of path) {
    result +=
      typeof part === `number`
        ? `[${part}]`
        : /^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(part)
          ? `.${part}`
          : `[${JSON.stringify(part)}]`;
  }

  return result;
}

function assertOpenAiCompatibleJsonSchema(
  value: unknown,
  path: readonly (number | string)[] = [],
): void {
  if (value == null || typeof value !== `object`) {
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertOpenAiCompatibleJsonSchema(item, [...path, index]);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (unsupportedOpenAiJsonSchemaKeywords.has(key)) {
      throw new Error(
        `OpenAI response format does not support JSON Schema keyword ${JSON.stringify(key)} at ${formatJsonSchemaPath([...path, key])}`,
      );
    }

    assertOpenAiCompatibleJsonSchema(child, [...path, key]);
  }
}

function zodToOpenAiJsonSchema<Schema extends z.ZodType>(
  schema: Schema,
): z.core.JSONSchema.BaseSchema {
  const jsonSchema = z.toJSONSchema(schema, { unrepresentable: `throw` });
  assertOpenAiCompatibleJsonSchema(jsonSchema);
  return jsonSchema;
}

export function zodResponseFormatJson<Schema extends z.ZodType>(
  schema: Schema,
): OpenAI.Responses.ResponseFormatTextJSONSchemaConfig {
  return {
    type: `json_schema`,
    name: `result_shape`,
    schema: zodToOpenAiJsonSchema(schema),
  };
}

export async function requestOpenAiResponseJson<Schema extends z.ZodType>(
  prompt: ChatPrompt<Schema>,
  options?: { signal?: AbortSignal; retries?: number; store?: boolean },
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
      format: zodResponseFormatJson(prompt.schema),
    },
    input: prompt.messages,
    store: options?.store,
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
