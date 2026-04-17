import {
  buildLeadCharacterDescriptionPrompt,
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
    test(`minimal input (no optional notes)`, () => {
      const result = buildSubLocationDescriptionPrompt({
        label: `Outside Lawson`,
        location: `Lawson`,
        sublocation: `Outside`,
        count: 4,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.",
          "user": "Location: Lawson
        Sublocation: Outside

        Generate 4 distinct reusable location descriptions for this exact combined place: Outside Lawson

        Each suggestion must:
        - Clearly reflect both the Location and the Sublocation
        - Describe stable, always-true aspects of the place
        - Return only the descriptive fragment itself, don't prefix with the place label
        - Avoid time of day, weather, or temporary events
        - Avoid actions or specific story moments
        - Be easy to visualize and reuse in different mnemonic scenes

        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
        }
      `);
    });

    test(`full input (all optional notes set)`, () => {
      const result = buildSubLocationDescriptionPrompt({
        label: `Outside Lawson`,
        location: `Lawson`,
        locationNotes: `The famous Japanese convenience chain store.`,
        sublocation: `Outside`,
        sublocationNotes: `Street view of the store front.`,
        count: 4,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.",
          "user": "Location: Lawson
        Sublocation: Outside

        Location notes: The famous Japanese convenience chain store.
        Sublocation notes: Street view of the store front.

        Generate 4 distinct reusable location descriptions for this exact combined place: Outside Lawson

        Each suggestion must:
        - Clearly reflect both the Location and the Sublocation
        - Describe stable, always-true aspects of the place
        - Return only the descriptive fragment itself, don't prefix with the place label
        - Avoid time of day, weather, or temporary events
        - Avoid actions or specific story moments
        - Be easy to visualize and reuse in different mnemonic scenes

        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
        }
      `);
    });

    test(`different count`, () => {
      const result = buildSubLocationDescriptionPrompt({
        label: `Gong Cha bathroom`,
        location: `Gong Cha`,
        sublocation: `bathroom`,
        count: 3,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.",
          "user": "Location: Gong Cha
        Sublocation: bathroom

        Generate 3 distinct reusable location descriptions for this exact combined place: Gong Cha bathroom

        Each suggestion must:
        - Clearly reflect both the Location and the Sublocation
        - Describe stable, always-true aspects of the place
        - Return only the descriptive fragment itself, don't prefix with the place label
        - Avoid time of day, weather, or temporary events
        - Avoid actions or specific story moments
        - Be easy to visualize and reuse in different mnemonic scenes

        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
        }
      `);
    });
  },
);

describe(
  `buildLeadCharacterDescriptionPrompt` satisfies HasNameOf<
    typeof buildLeadCharacterDescriptionPrompt
  >,
  () => {
    test(`minimal input (no existing description)`, () => {
      const result = buildLeadCharacterDescriptionPrompt({
        name: `Marcus`,
        sound: `m`,
        count: 4,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create vivid, distinct character personalities for Mandarin pronunciation mnemonic palaces.
        Your goal is to define a memorable character with a unique trait, backstory, or personality that makes them unforgettable.
        Each character bio should feel distinct, specific, and reusable across many mnemonic stories.
        Focus on personality quirks, memorable traits, backstory hints, or distinctive mannerisms.
        Make characters feel like real people with depth—avoid generic or flat descriptions.
        Keep each bio to 1-2 sentences. Make them specific, visual, and easy to remember.",
          "user": "Character: Marcus
        Associated pinyin sound: m

        Generate 4 distinct character personality descriptions for this character.

        Each suggestion must:
        - Describe a unique, memorable personality or trait
        - Feel like a real person with specific quirks or depth
        - Be distinct from other suggestions
        - Return only the descriptive fragment itself, don't prefix with the character name
        - Be easy to visualize and reuse in different mnemonic stories
        - NOT be a definition or encyclopedia-style description

        Good suggestions feel like a vivid character profile.
        Bad suggestions feel generic, flat, or encyclopedia-like.",
        }
      `);
    });

    test(`full input (with existing description)`, () => {
      const result = buildLeadCharacterDescriptionPrompt({
        name: `Marcus`,
        sound: `m`,
        existingDescription: `A tech entrepreneur with a sharp sense of humor`,
        count: 3,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "system": "You create vivid, distinct character personalities for Mandarin pronunciation mnemonic palaces.
        Your goal is to define a memorable character with a unique trait, backstory, or personality that makes them unforgettable.
        Each character bio should feel distinct, specific, and reusable across many mnemonic stories.
        Focus on personality quirks, memorable traits, backstory hints, or distinctive mannerisms.
        Make characters feel like real people with depth—avoid generic or flat descriptions.
        Keep each bio to 1-2 sentences. Make them specific, visual, and easy to remember.",
          "user": "Character: Marcus
        Associated pinyin sound: m

        Existing description: A tech entrepreneur with a sharp sense of humor

        Generate 3 distinct character personality descriptions for this character.

        Each suggestion must:
        - Describe a unique, memorable personality or trait
        - Feel like a real person with specific quirks or depth
        - Be distinct from other suggestions
        - Return only the descriptive fragment itself, don't prefix with the character name
        - Be easy to visualize and reuse in different mnemonic stories
        - NOT be a definition or encyclopedia-style description

        Good suggestions feel like a vivid character profile.
        Bad suggestions feel generic, flat, or encyclopedia-like.",
        }
      `);
    });
  },
);
