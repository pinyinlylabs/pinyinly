import { getOpenAIClient } from "@/server/lib/openai/client";
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

export async function requestOpenAiJson<Schema extends z.ZodType>(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  schema: Schema;
}): Promise<z.infer<Schema>> {
  const client = getOpenAIClient();

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: `gpt-5-mini`,
    response_format: openAiZodResponseFormat(opts.schema, `result_shape`),
    messages: [
      { role: `system`, content: opts.system },
      { role: `user`, content: opts.user },
    ],
  };

  const completion = await client.chat.completions.create(body);

  const message = completion.choices[0]?.message;
  const content = message?.content ?? ``;

  if (content.length === 0) {
    throw new Error(`OpenAI response was empty`);
  }

  return opts.schema.parse(JSON.parse(content));
}
