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

interface ChatPromptBase<Schema extends z.ZodType> {
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

/**
 * Optional function to transform the validated response data into the shape
 * consumers of the prompt want. This allows the schema to be optimised for the
 * model (e.g. fewer output tokens) rather than for its consumers.
 */
interface ChatPromptWithOptionalTransform<
  Schema extends z.ZodType,
  Output = z.infer<Schema>,
> extends ChatPromptBase<Schema> {
  transform?: (data: z.infer<Schema>) => Output;
}

interface ChatPromptWithRequiredTransform<
  Schema extends z.ZodType,
  Output = z.infer<Schema>,
> extends ChatPromptBase<Schema> {
  transform: (data: z.infer<Schema>) => Output;
}

/**
 * Use this when declaring a prompt, it enforces that `transform` is provided
 * when `Output` differs from the schema's inferred type (otherwise there'd be
 * no way to produce `Output`).
 */
export type ChatPrompt<Schema extends z.ZodType, Output = z.infer<Schema>> = [
  z.infer<Schema>,
] extends [Output]
  ? [Output] extends [z.infer<Schema>]
    ? ChatPromptWithOptionalTransform<Schema, Output>
    : ChatPromptWithRequiredTransform<Schema, Output>
  : ChatPromptWithRequiredTransform<Schema, Output>;

/**
 * Use this when accepting a prompt, `transform` is always optional here so that
 * `Output` can be inferred from it.
 */
export type ChatPromptLike<
  Schema extends z.ZodType,
  Output = z.infer<Schema>,
> = ChatPromptWithOptionalTransform<Schema, Output>;

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

export async function requestOpenAiResponseJson<
  Schema extends z.ZodType,
  Output = z.infer<Schema>,
>(
  prompt: ChatPromptLike<Schema, Output>,
  options?: {
    signal?: AbortSignal;
    retries?: number;
    store?: boolean;
    serviceTier?: OpenAI.Responses.Response[`service_tier`];
  },
): Promise<{
  /**
   * Final data, with `transform` applied if the prompt defines one. This is the
   * data that should be used by the caller.
   */
  data: Output;
  /**
   * The raw output from the OpenAI response, which may include additional
   * metadata and information about the response.
   */
  output: OpenAI.Responses.Response[`output`];
  usage?: OpenAI.Responses.ResponseUsage;
  model: string;
  reasoning?: OpenAI.Reasoning | null;
  status?: OpenAI.Responses.Response[`status`];
  /**
   * Use "flex" processing to get 50% discount (Batch API pricing).
   */
  serviceTier?: OpenAI.Responses.Response[`service_tier`];
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
    service_tier: options?.serviceTier,
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

    let parsed: z.infer<Schema>;
    try {
      parsed = prompt.schema.parse(JSON.parse(content), { reportInput: true });
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

    const data =
      prompt.transform == null
        ? // Without a transform `Output` is inferred as `z.infer<Schema>`, but
          // TypeScript can't narrow that from the generic parameter.
          (parsed as Output)
        : prompt.transform(parsed);

    return {
      data,
      output: response.output,
      usage: response.usage,
      model: response.model,
      reasoning: response.reasoning,
      status: response.status,
      serviceTier: response.service_tier,
    };
  }
}
