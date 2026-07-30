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
          "name": "anonymous_schema",
          "schema": {
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

    test(`uses the meta title for the name if present`, () => {
      const schema = z
        .object({
          hint: z.string(),
        })
        .meta({ title: `custom_name` });

      const result = zodResponseFormatJson(schema);

      expect(result.name).toBe(`custom_name`);
    });

    test(`fixes "additionalProperties: {}" to "additionalProperties: true"`, () => {
      const schema = z.object().loose();

      const result = zodResponseFormatJson(schema);
      expect(result.schema[`additionalProperties`]).toBe(true);
    });
  },
);
