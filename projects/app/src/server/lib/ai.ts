import { getOpenAIClient } from "@/server/lib/openai/client";
import type { OpenAI } from "openai";
import { z } from "zod";
import makeDebug from "debug";
import { invariant } from "@pinyinly/lib/invariant";
import isEqual from "lodash/isEqual";
import type { JSONSchemaGeneratorParams } from "zod/v4/core";

const debug = makeDebug(`pyly:ai.ts`);

export interface ChatPromptMessage {
  role: `system` | `user` | `assistant`;
  content: string;
}

export interface ChatPrompt<Schema extends z.ZodType> {
  model: OpenAI.AllModels;
  reasoningEffort: OpenAI.ReasoningEffort;
  messages: ChatPromptMessage[];
  /**
   * The Zod schema describing the expected shape of the assistant's response.
   * This is used for type inference and validation of the response data.
   */
  schema: Schema;
  timeout?: number;
}

export function zodResponseFormatJson<Schema extends z.ZodType>(
  schema: Schema,
): OpenAI.Responses.ResponseFormatTextJSONSchemaConfig {
  const jsonSchema = z.toJSONSchema(schema, {
    target: `openapi-3.0`,
    unrepresentable: `throw`,
    override: (ctx) => {
      fixAdditionalPropertiesEmptyObject(ctx);
    },
  });

  const title = schema.meta()?.title ?? `anonymous schema`;
  const name = title.replaceAll(/[^a-zA-Z0-9_-]/gu, `_`);

  return {
    type: `json_schema`,
    name: name,
    schema: jsonSchema,
  };
}

type JsonSchemaOverride = NonNullable<JSONSchemaGeneratorParams[`override`]>;

/**
 * Fixes the `additionalProperties: {}` from a z.object().loose() schema to be
 * `additionalProperties: true` for OpenAI compatibility.
 */
const fixAdditionalPropertiesEmptyObject: JsonSchemaOverride = ({
  jsonSchema,
}) => {
  if (
    jsonSchema.type === `object` &&
    isEqual(jsonSchema.additionalProperties, {})
  ) {
    jsonSchema.additionalProperties = true;
  }
};

export async function requestOpenAiResponseJson<Schema extends z.ZodType>(
  prompt: ChatPrompt<Schema>,
  options?: { signal?: AbortSignal; retries?: number; store?: boolean },
): Promise<{
  data: z.infer<Schema>;
  usage?: OpenAI.Responses.ResponseUsage;
  model: string;
  reasoning?: OpenAI.Reasoning | null;
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
      ...(prompt.timeout == null ? {} : { timeout: prompt.timeout }),
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
      reasoning: response.reasoning,
    };
  }
}
