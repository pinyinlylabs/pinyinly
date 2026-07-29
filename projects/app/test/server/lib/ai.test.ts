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
  },
);
