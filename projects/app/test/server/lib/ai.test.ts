import { zodResponseFormatJson } from "#server/lib/ai.ts";
import { describe, expect, test } from "vitest";
import { z } from "zod";

describe(
  `zodResponseFormatJson utility` satisfies HasNameOf<
    typeof zodResponseFormatJson
  >,
  () => {
    test(`returns OpenAI json_schema format for a basic object schema`, () => {
      const schema = z.object({
        hint: z.string(),
        score: z.number().int().min(0).max(10),
        tags: z.array(z.string()),
      });

      const result = zodResponseFormatJson(schema);

      expect(result).toMatchInlineSnapshot(`
        {
          "name": "result_shape",
          "schema": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "additionalProperties": false,
            "properties": {
              "hint": {
                "type": "string",
              },
              "score": {
                "maximum": 10,
                "minimum": 0,
                "type": "integer",
              },
              "tags": {
                "items": {
                  "type": "string",
                },
                "type": "array",
              },
            },
            "required": [
              "hint",
              "score",
              "tags",
            ],
            "type": "object",
          },
          "type": "json_schema",
        }
      `);
    });

    test(`unrepresentable zod types throw error`, () => {
      const schema = z.object({
        hint: z.string(),
        callback: z.function({
          input: [z.string()],
          output: z.void(),
        }),
      });

      expect(() => zodResponseFormatJson(schema)).toThrow();
    });

    test(`array min item constraints throw error`, () => {
      expect(() => zodResponseFormatJson(z.array(z.number()).min(1))).toThrow(
        /"minItems"/u,
      );
    });

    test(`array max item constraints throw error`, () => {
      expect(() => zodResponseFormatJson(z.array(z.number()).max(5))).toThrow(
        /"maxItems"/u,
      );
    });

    test(`tuple schemas throw because OpenAI does not support prefixItems`, () => {
      const schema = z.object({
        experiences: z.tuple([
          z.object({ role: z.literal(`arrival`) }),
          z.object({ role: z.literal(`heart`) }),
        ]),
      });

      expect(() => zodResponseFormatJson(schema)).toThrow(/"prefixItems"/u);
    });
  },
);
