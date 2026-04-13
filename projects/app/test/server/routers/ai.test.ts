import {
  buildPronunciationHintPrompt,
  buildSubLocationDescriptionPrompt,
} from "#server/routers/ai.ts";
import { openAiZodResponseFormat } from "#server/lib/ai.ts";
import { describe, expect, test } from "vitest";
import { z } from "zod/v4";

describe(
  `buildPronunciationHintPrompt` satisfies HasNameOf<
    typeof buildPronunciationHintPrompt
  >,
  () => {
    test(`minimal input (no optional fields)`, () => {
      const result = buildPronunciationHintPrompt({
        leadCharacter: { name: `Ethan` },
        location: { name: `Gong Cha bathroom` },
        cue: { word: `use` },
        count: 3,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create short pronunciation mnemonic story ideas for Mandarin learners.
        Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
        The goal is to create a scene that is easy to picture and easy to remember.
        Each scene should feel like a tiny absurd sketch or striking mental snapshot.
        Always clearly include the named character and location.
        Use the keyword as light inspiration for what happens, but do not turn the result into a definition.
        If extra character or location details are provided, use them to make the story more specific.
        Keep each hint to 1-2 sentences.
        Prefer visual, unusual, and memorable situations over generic ones.",
          "user": "Story ingredients:
        - Lead character: Ethan
        - Location: Gong Cha bathroom
        - Cue: use

        Generate 3 distinct mnemonic story ideas.
        Each suggestion must explicitly include the character and location by name.
        Use the keyword as light inspiration for the central action, object, or conflict.
        Good suggestions are specific, visual, unusual, and easy to replay mentally.
        Bad suggestions are generic, flat, or mostly just a definition.",
        }
      `);
    });

    test(`full input (all optional fields set)`, () => {
      const result = buildPronunciationHintPrompt({
        leadCharacter: {
          name: `Ethan`,
          bio: `Ethan Klein — loud, expressive, chaotic`,
        },
        location: {
          name: `Gong Cha bathroom`,
          description: `A cramped, slightly sticky bathroom with bubble tea posters`,
        },
        cue: { word: `use`, meaning: `to use; to employ` },
        count: 4,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create short pronunciation mnemonic story ideas for Mandarin learners.
        Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
        The goal is to create a scene that is easy to picture and easy to remember.
        Each scene should feel like a tiny absurd sketch or striking mental snapshot.
        Always clearly include the named character and location.
        Use the keyword as light inspiration for what happens, but do not turn the result into a definition.
        If extra character or location details are provided, use them to make the story more specific.
        Keep each hint to 1-2 sentences.
        Prefer visual, unusual, and memorable situations over generic ones.",
          "user": "Story ingredients:
        - Lead character: Ethan
        - Location: Gong Cha bathroom
        - Cue: use

        Lead character bio: Ethan Klein — loud, expressive, chaotic
        Location description: A cramped, slightly sticky bathroom with bubble tea posters
        Cue meaning: to use; to employ

        Generate 4 distinct mnemonic story ideas.
        Each suggestion must explicitly include the character and location by name.
        Use the keyword as light inspiration for the central action, object, or conflict.
        Good suggestions are specific, visual, unusual, and easy to replay mentally.
        Bad suggestions are generic, flat, or mostly just a definition.",
        }
      `);
    });
  },
);

describe(
  `openAiZodResponseFormat` satisfies HasNameOf<typeof openAiZodResponseFormat>,
  () => {
    test(`produces valid ResponseFormatJSONSchema`, () => {
      const schema = z.object({
        suggestions: z
          .array(
            z.object({
              hint: z.string(),
              confidence: z.number().min(0).max(1),
            }),
          )
          .min(1),
      });

      const result = openAiZodResponseFormat(schema, `test_response`);

      expect(result.type).toBe(`json_schema`);
      expect(result.json_schema.name).toBe(`test_response`);
      expect(result.json_schema.schema).toBeDefined();
      expect(typeof result.json_schema.schema).toBe(`object`);
    });

    test(`handles simple scalar schema`, () => {
      const schema = z.string();

      const result = openAiZodResponseFormat(schema, `simple_string`);

      expect(result.type).toBe(`json_schema`);
      expect(result.json_schema.name).toBe(`simple_string`);
      expect(result.json_schema.schema).toBeDefined();
      expect(typeof result.json_schema.schema).toBe(`object`);
    });
  },
);

describe(
  `buildSubLocationDescriptionPrompt` satisfies HasNameOf<
    typeof buildSubLocationDescriptionPrompt
  >,
  () => {
    test(`minimal input`, () => {
      const result = buildSubLocationDescriptionPrompt({
        location: `Gong Cha bathroom`,
        count: 4,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create vivid sublocation descriptions for Mandarin pronunciation mnemonic scenes.
        Each description should help someone instantly picture a specific place.
        Prefer concrete sensory details over abstract words.
        Use visual anchors like objects, textures, lighting, signage, sounds, or smells.
        Keep each description to 1-2 sentences and avoid dictionary-style definitions.
        Make suggestions distinct from one another and easy to remember.",
          "user": "Sublocation: Gong Cha bathroom

        Generate 4 distinct sublocation descriptions for this exact place.
        Each suggestion must reference the sublocation name exactly as written: Gong Cha bathroom.
        Good suggestions are specific, visual, unusual, and easy to replay mentally.
        Bad suggestions are generic, flat, or mostly abstract adjectives.",
        }
      `);
    });

    test(`different count`, () => {
      const result = buildSubLocationDescriptionPrompt({
        location: `Gong Cha bathroom`,
        count: 3,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create vivid sublocation descriptions for Mandarin pronunciation mnemonic scenes.
        Each description should help someone instantly picture a specific place.
        Prefer concrete sensory details over abstract words.
        Use visual anchors like objects, textures, lighting, signage, sounds, or smells.
        Keep each description to 1-2 sentences and avoid dictionary-style definitions.
        Make suggestions distinct from one another and easy to remember.",
          "user": "Sublocation: Gong Cha bathroom

        Generate 3 distinct sublocation descriptions for this exact place.
        Each suggestion must reference the sublocation name exactly as written: Gong Cha bathroom.
        Good suggestions are specific, visual, unusual, and easy to replay mentally.
        Bad suggestions are generic, flat, or mostly abstract adjectives.",
        }
      `);
    });
  },
);
