// pyly-not-src-test
import { describe, test, expect } from "vitest";
import { assertOpenAiCompatibleJsonSchema } from "./helpers.ts";
import { z } from "zod";
import { zodResponseFormatJson } from "#server/lib/ai.js";

function assertSchema<Schema extends z.ZodType>(schema: Schema) {
  const responseFormat = zodResponseFormatJson(schema);
  assertOpenAiCompatibleJsonSchema(responseFormat.schema);
}

describe(`assertOpenAiCompatibleJsonSchema`, () => {
  test(`unrepresentable zod types throw error`, () => {
    const schema = z.object({
      hint: z.string(),
      callback: z.function({
        input: [z.string()],
        output: z.void(),
      }),
    });

    expect(() => {
      assertSchema(schema);
    }).toThrow();
  });

  test(`array min item constraints throw error`, () => {
    expect(() => {
      assertSchema(z.array(z.number()).min(1));
    }).toThrow(/"minItems"/u);
  });

  test(`array max item constraints throw error`, () => {
    expect(() => {
      assertSchema(z.array(z.number()).max(5));
    }).toThrow(/"maxItems"/u);
  });

  test(`tuple schemas throw because OpenAI does not support prefixItems`, () => {
    const jsonSchema = {
      $schema: `https://json-schema.org/draft/2020-12/schema`,
      type: `array`,
      prefixItems: [{ type: `string` }, { type: `integer` }],
      unevaluatedItems: false,
    };

    expect(() => {
      assertOpenAiCompatibleJsonSchema(jsonSchema);
    }).toThrow(/"prefixItems"/u);
  });

  test(`empty object for additionalProperties throws error`, () => {
    const jsonSchema = {
      $schema: `https://json-schema.org/draft/2020-12/schema`,
      additionalProperties: {},
      type: `object`,
    };

    expect(() => {
      assertOpenAiCompatibleJsonSchema(jsonSchema);
    }).toThrow();
  });
});
