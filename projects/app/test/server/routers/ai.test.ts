import {
  buildLeadCharacterDescriptionPrompt,
  buildMeaningHintLogicalPrompt,
  buildMeaningHintPrompt,
  buildPronunciationHintPrompt,
  buildSubLocationDescriptionPrompt,
  renderPromptTemplate,
} from "#util/prompts.ts";
import { openAiZodResponseFormat } from "#server/lib/ai.ts";
import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import omit from "lodash/omit";

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

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
        Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
        The goal is to create a scene that is easy to picture and easy to remember.
        Each scene should feel like a tiny absurd sketch or striking mental snapshot.
        Always clearly include the named character and location.
        When a character article is provided (e.g. "the", "a"), always refer to the character with that article (e.g. "the seal") rather than as a bare proper noun.
        Use the keyword as light inspiration for what happens, but do not turn the result into a definition.
        When cue meaning context is provided, treat it as authoritative and use that intended sense of the cue word.
        When creative direction is provided, treat it as soft guidance for tone and style while still prioritizing mnemonic clarity.
        When the cue word (or a close form of it) appears in the story text, wrap it in ==word== markup (e.g. ==can== or ==canning==).
        If extra character or location details are provided, use them to make the story more specific.
        Keep each hint to 1-2 sentences.
        Prefer visual, unusual, and memorable situations over generic ones.
        Each suggestion must explicitly include the character and location by name.
        Use the keyword as light inspiration for the central action, object, or conflict.
        If cue meaning is provided, follow that exact sense instead of other possible meanings of the same word.
        Good suggestions are specific, visual, unusual, and easy to replay mentally.
        Bad suggestions are generic, flat, or mostly just a definition.
        Format: wrap the cue word (or its inflected form) in ==word== whenever it appears in the story text.",
          "user": "Generate 3 distinct mnemonic story ideas.

        <data>
        {
          "leadCharacter": {
            "name": "Ethan"
          },
          "location": {
            "name": "Gong Cha bathroom"
          },
          "cue": {
            "word": "use"
          }
        }
        </data>",
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
        creativeDirection: `Play it as a surreal heist-comedy beat with one unforgettable prop.`,
        count: 4,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
        Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
        The goal is to create a scene that is easy to picture and easy to remember.
        Each scene should feel like a tiny absurd sketch or striking mental snapshot.
        Always clearly include the named character and location.
        When a character article is provided (e.g. "the", "a"), always refer to the character with that article (e.g. "the seal") rather than as a bare proper noun.
        Use the keyword as light inspiration for what happens, but do not turn the result into a definition.
        When cue meaning context is provided, treat it as authoritative and use that intended sense of the cue word.
        When creative direction is provided, treat it as soft guidance for tone and style while still prioritizing mnemonic clarity.
        When the cue word (or a close form of it) appears in the story text, wrap it in ==word== markup (e.g. ==can== or ==canning==).
        If extra character or location details are provided, use them to make the story more specific.
        Keep each hint to 1-2 sentences.
        Prefer visual, unusual, and memorable situations over generic ones.
        Each suggestion must explicitly include the character and location by name.
        Use the keyword as light inspiration for the central action, object, or conflict.
        If cue meaning is provided, follow that exact sense instead of other possible meanings of the same word.
        Good suggestions are specific, visual, unusual, and easy to replay mentally.
        Bad suggestions are generic, flat, or mostly just a definition.
        Format: wrap the cue word (or its inflected form) in ==word== whenever it appears in the story text.",
          "user": "Generate 4 distinct mnemonic story ideas.

        <data>
        {
          "leadCharacter": {
            "name": "Ethan",
            "bio": "Ethan Klein — loud, expressive, chaotic"
          },
          "location": {
            "name": "Gong Cha bathroom",
            "description": "A cramped, slightly sticky bathroom with bubble tea posters"
          },
          "cue": {
            "word": "use",
            "meaning": "to use; to employ"
          },
          "creativeDirection": "Play it as a surreal heist-comedy beat with one unforgettable prop."
        }
        </data>",
        }
      `);
    });

    test(`lead character with article`, () => {
      const result = buildPronunciationHintPrompt({
        leadCharacter: { name: `seal`, article: `the` },
        location: { name: `River Stage bathroom` },
        cue: { word: `color` },
        count: 2,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
        Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
        The goal is to create a scene that is easy to picture and easy to remember.
        Each scene should feel like a tiny absurd sketch or striking mental snapshot.
        Always clearly include the named character and location.
        When a character article is provided (e.g. "the", "a"), always refer to the character with that article (e.g. "the seal") rather than as a bare proper noun.
        Use the keyword as light inspiration for what happens, but do not turn the result into a definition.
        When cue meaning context is provided, treat it as authoritative and use that intended sense of the cue word.
        When creative direction is provided, treat it as soft guidance for tone and style while still prioritizing mnemonic clarity.
        When the cue word (or a close form of it) appears in the story text, wrap it in ==word== markup (e.g. ==can== or ==canning==).
        If extra character or location details are provided, use them to make the story more specific.
        Keep each hint to 1-2 sentences.
        Prefer visual, unusual, and memorable situations over generic ones.
        Each suggestion must explicitly include the character and location by name.
        Use the keyword as light inspiration for the central action, object, or conflict.
        If cue meaning is provided, follow that exact sense instead of other possible meanings of the same word.
        Good suggestions are specific, visual, unusual, and easy to replay mentally.
        Bad suggestions are generic, flat, or mostly just a definition.
        Format: wrap the cue word (or its inflected form) in ==word== whenever it appears in the story text.",
          "user": "Generate 2 distinct mnemonic story ideas.

        <data>
        {
          "leadCharacter": {
            "name": "seal",
            "article": "the"
          },
          "location": {
            "name": "River Stage bathroom"
          },
          "cue": {
            "word": "color"
          }
        }
        </data>",
        }
      `);
    });
  },
);

describe(
  `buildMeaningHintPrompt` satisfies HasNameOf<typeof buildMeaningHintPrompt>,
  () => {
    test(`minimal input (no component context)`, () => {
      const result = buildMeaningHintPrompt({
        hanzi: `好`,
        meaning: {
          hanziWord: `好`,
          glosses: [`good`],
        },
        count: 3,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates short meaning-recognition mnemonic hints for Mandarin learners.
        Your job is to help the learner remember what a Hanzi means using its visual components.
        Use the provided component details as the core building blocks of each hint.
        Write vivid, concrete, and memorable mini-scenes or mental images.
        Focus on meaning recall, not pronunciation.
        Avoid historical or etymological claims unless directly supported by the provided component context.
        Keep each hint to 1-2 sentences.
        Prefer unusual but clear imagery over generic definitions.
        Each suggestion should help a learner recall the target meaning from the character's components.
        Do not write a plain dictionary definition.
        Do not introduce pronunciation guidance.
        If component context is provided, ground the hint in those components explicitly.",
          "user": "Generate 3 distinct mnemonic hints.
        <data>
        {
          "hanzi": "好",
          "meaning": {
            "hanziWord": "好",
            "glosses": [
              "good"
            ]
          }
        }
        </data>",
        }
      `);
    });

    test(`full input (with component context)`, () => {
      const result = buildMeaningHintPrompt({
        hanzi: `好`,
        meaning: {
          hanziWord: `好`,
          glosses: [`good`, `well`, `fine`],
        },
        components: [
          {
            hanzi: `女`,
            meaning: `woman`,
          },
          {
            hanzi: `子`,
            label: `child`,
            meaning: `child`,
          },
        ],
        count: 4,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates short meaning-recognition mnemonic hints for Mandarin learners.
        Your job is to help the learner remember what a Hanzi means using its visual components.
        Use the provided component details as the core building blocks of each hint.
        Write vivid, concrete, and memorable mini-scenes or mental images.
        Focus on meaning recall, not pronunciation.
        Avoid historical or etymological claims unless directly supported by the provided component context.
        Keep each hint to 1-2 sentences.
        Prefer unusual but clear imagery over generic definitions.
        Each suggestion should help a learner recall the target meaning from the character's components.
        Do not write a plain dictionary definition.
        Do not introduce pronunciation guidance.
        If component context is provided, ground the hint in those components explicitly.",
          "user": "Generate 4 distinct mnemonic hints.
        <data>
        {
          "hanzi": "好",
          "meaning": {
            "hanziWord": "好",
            "glosses": [
              "good",
              "well",
              "fine"
            ]
          },
          "components": [
            {
              "hanzi": "女",
              "meaning": "woman"
            },
            {
              "hanzi": "子",
              "label": "child",
              "meaning": "child"
            }
          ]
        }
        </data>",
        }
      `);
    });
  },
);

describe(
  `buildMeaningHintLogicalPrompt` satisfies HasNameOf<
    typeof buildMeaningHintLogicalPrompt
  >,
  () => {
    test(`minimal input (no component context)`, () => {
      const result = buildMeaningHintLogicalPrompt({
        hanzi: `好`,
        meaning: {
          hanziWord: `好`,
          glosses: [`good`],
        },
        count: 3,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that generates memorable mnemonic phrases for Chinese characters. Your job is to help the learner remember what a Hanzi means using just its visual components.

        Rules:
        - Keep mnemonics realistic, intuitive, concrete and memorable.
        - Keep mnemonics short, 1-2 sentences is optimal.
        - Leverage the logical connection between the components to explain the target character.
        - The disambiguation values are form/meaning guidance only, do not include them directly in the hint.
        - Anchor on the exact gloss values, don't use them as a base stem for derivative words.
        - Only focus on meaning recall, not pronunciation.
        - Avoid introducing unnecessary elements that could distract from the core elements.
        - Put the hanzi after each gloss in parenthesis: <gloss> (<hanzi>)",
          "user": "Generate 3 distinct mnemonic hints:

        <data>
        {
          "targetCharacter": {
            "hanzi": "好",
            "gloss": "good"
          },
          "components": []
        }
        </data>",
        }
      `);
    });

    test(`full input (with component context)`, () => {
      const result = buildMeaningHintLogicalPrompt({
        hanzi: `好`,
        meaning: {
          hanziWord: `好`,
          glosses: [`good`, `well`, `fine`],
        },
        components: [
          {
            hanzi: `女`,
            meaning: `woman`,
          },
          {
            hanzi: `子`,
            label: `child`,
            meaning: `child`,
          },
        ],
        count: 4,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that generates memorable mnemonic phrases for Chinese characters. Your job is to help the learner remember what a Hanzi means using just its visual components.

        Rules:
        - Keep mnemonics realistic, intuitive, concrete and memorable.
        - Keep mnemonics short, 1-2 sentences is optimal.
        - Leverage the logical connection between the components to explain the target character.
        - The disambiguation values are form/meaning guidance only, do not include them directly in the hint.
        - Anchor on the exact gloss values, don't use them as a base stem for derivative words.
        - Only focus on meaning recall, not pronunciation.
        - Avoid introducing unnecessary elements that could distract from the core elements.
        - Put the hanzi after each gloss in parenthesis: <gloss> (<hanzi>)",
          "user": "Generate 4 distinct mnemonic hints:

        <data>
        {
          "targetCharacter": {
            "hanzi": "好",
            "gloss": "good",
            "disambiguation": "well; fine"
          },
          "components": [
            {
              "hanzi": "女",
              "gloss": "woman"
            },
            {
              "hanzi": "子",
              "gloss": "child"
            }
          ]
        }
        </data>",
        }
      `);
    });
  },
);

describe(
  `renderPromptTemplate` satisfies HasNameOf<typeof renderPromptTemplate>,
  () => {
    test(`replaces known placeholders including internal newlines`, () => {
      const result = renderPromptTemplate(
        `A {{ adjective }} template with:\n{{ payload }}`,
        {
          adjective: `helpful`,
          payload: `line 1\nline 2`,
        },
      );

      expect(result).toBe(`A helpful template with:\nline 1\nline 2`);
    });

    test(`supports placeholder names with surrounding whitespace`, () => {
      const result = renderPromptTemplate(`Count: {{   count   }}`, {
        count: `4`,
      });

      expect(result).toBe(`Count: 4`);
    });

    test(`replaces unknown placeholders with empty string`, () => {
      const result = renderPromptTemplate(`Start {{ missing }} end`, {});

      expect(result).toBe(`Start  end`);
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

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
        Each suggestion must clearly reflect both the Location and the Sublocation.
        If a Viewpoint is provided, ensure the description matches that perspective.
        Describe stable, always-true aspects of the place.
        Return only the descriptive fragment itself, don't prefix with the place label.
        Avoid time of day, weather, or temporary events.
        Avoid actions or specific story moments.
        Be easy to visualize and reuse in different mnemonic scenes.
        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
          "user": "Generate 4 distinct reusable location descriptions for this exact combined place.

        <data>
        {
          "label": "Outside Lawson",
          "location": "Lawson",
          "sublocation": "Outside"
        }
        </data>",
        }
      `);
    });

    test(`full input (all optional notes and viewpoint set)`, () => {
      const result = buildSubLocationDescriptionPrompt({
        label: `Outside Lawson`,
        location: `Lawson`,
        locationNotes: `The famous Japanese convenience chain store.`,
        sublocation: `Outside`,
        viewpoint: `At eye level looking at the storefront`,
        count: 4,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
        Each suggestion must clearly reflect both the Location and the Sublocation.
        If a Viewpoint is provided, ensure the description matches that perspective.
        Describe stable, always-true aspects of the place.
        Return only the descriptive fragment itself, don't prefix with the place label.
        Avoid time of day, weather, or temporary events.
        Avoid actions or specific story moments.
        Be easy to visualize and reuse in different mnemonic scenes.
        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
          "user": "Generate 4 distinct reusable location descriptions for this exact combined place.

        <data>
        {
          "label": "Outside Lawson",
          "location": "Lawson",
          "sublocation": "Outside",
          "locationNotes": "The famous Japanese convenience chain store.",
          "viewpoint": "At eye level looking at the storefront"
        }
        </data>",
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

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
        Each suggestion must clearly reflect both the Location and the Sublocation.
        If a Viewpoint is provided, ensure the description matches that perspective.
        Describe stable, always-true aspects of the place.
        Return only the descriptive fragment itself, don't prefix with the place label.
        Avoid time of day, weather, or temporary events.
        Avoid actions or specific story moments.
        Be easy to visualize and reuse in different mnemonic scenes.
        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
          "user": "Generate 3 distinct reusable location descriptions for this exact combined place.

        <data>
        {
          "label": "Gong Cha bathroom",
          "location": "Gong Cha",
          "sublocation": "bathroom"
        }
        </data>",
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

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates vivid, distinct character personalities for Mandarin pronunciation mnemonic palaces.
        Your goal is to define a memorable character with a unique trait, backstory, or personality that makes them unforgettable.
        Each character bio should feel distinct, specific, and reusable across many mnemonic stories.
        Focus on personality quirks, memorable traits, backstory hints, or distinctive mannerisms.
        Make characters feel like real people with depth—avoid generic or flat descriptions.
        Keep each bio to 1-2 sentences. Make them specific, visual, and easy to remember.
        Each suggestion must describe a unique, memorable personality or trait.
        Each suggestion should feel like a real person with specific quirks or depth.
        Each suggestion should be distinct from other suggestions.
        Return only the descriptive fragment itself, don't prefix with the character name.
        Be easy to visualize and reuse in different mnemonic stories.
        Do not write a definition or encyclopedia-style description.
        Good suggestions feel like a vivid character profile.
        Bad suggestions feel generic, flat, or encyclopedia-like.",
          "user": "Generate 4 distinct character personality descriptions for this character.

        <data>
        {
          "name": "Marcus",
          "sound": "m"
        }
        </data>",
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

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "system": "You're a helpful assistant that creates vivid, distinct character personalities for Mandarin pronunciation mnemonic palaces.
        Your goal is to define a memorable character with a unique trait, backstory, or personality that makes them unforgettable.
        Each character bio should feel distinct, specific, and reusable across many mnemonic stories.
        Focus on personality quirks, memorable traits, backstory hints, or distinctive mannerisms.
        Make characters feel like real people with depth—avoid generic or flat descriptions.
        Keep each bio to 1-2 sentences. Make them specific, visual, and easy to remember.
        Each suggestion must describe a unique, memorable personality or trait.
        Each suggestion should feel like a real person with specific quirks or depth.
        Each suggestion should be distinct from other suggestions.
        Return only the descriptive fragment itself, don't prefix with the character name.
        Be easy to visualize and reuse in different mnemonic stories.
        Do not write a definition or encyclopedia-style description.
        Good suggestions feel like a vivid character profile.
        Bad suggestions feel generic, flat, or encyclopedia-like.",
          "user": "Generate 3 distinct character personality descriptions for this character.

        <data>
        {
          "name": "Marcus",
          "sound": "m",
          "existingDescription": "A tech entrepreneur with a sharp sense of humor"
        }
        </data>",
        }
      `);
    });
  },
);
