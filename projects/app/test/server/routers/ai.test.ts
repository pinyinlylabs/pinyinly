import {
  buildMnemonicActorProfilePrompt,
  buildMeaningHintCausualBridgePrompt,
  buildMeaningHintLogicalPrompt,
  buildMeaningHintPrompt,
  buildPronunciationHintFantasyPrompt,
  buildPronunciationHintRealisticPrompt,
  buildLocationSetDescriptionPrompt,
  renderPromptTemplate,
} from "#util/prompts.ts";
import { describe, expect, test } from "vitest";
import omit from "lodash/omit";
import { z } from "zod";

function collectMissingRequiredProperties(
  schema: unknown,
  path = `$`,
): string[] {
  const issues: string[] = [];

  if (schema == null || typeof schema !== `object`) {
    return issues;
  }

  const node = schema as Record<string, unknown>;

  const properties = node[`properties`];
  if (properties != null && typeof properties === `object`) {
    const propertyKeys = Object.keys(properties as Record<string, unknown>);
    if (propertyKeys.length > 0) {
      const required = node[`required`];
      if (Array.isArray(required)) {
        const requiredSet = new Set(
          required.filter(
            (entry): entry is string => typeof entry === `string`,
          ),
        );

        for (const key of propertyKeys) {
          if (!requiredSet.has(key)) {
            issues.push(`${path}: missing required property "${key}"`);
          }
        }
      } else {
        issues.push(
          `${path}: object with properties must define required[] containing every property key`,
        );
      }

      for (const [key, value] of Object.entries(
        properties as Record<string, unknown>,
      )) {
        issues.push(
          ...collectMissingRequiredProperties(value, `${path}.${key}`),
        );
      }
    }
  }

  const items = node[`items`];
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      issues.push(
        ...collectMissingRequiredProperties(items[i], `${path}.items[${i}]`),
      );
    }
  } else if (items != null) {
    issues.push(...collectMissingRequiredProperties(items, `${path}.items`));
  }

  for (const keyword of [`allOf`, `anyOf`, `oneOf`] as const) {
    const variants = node[keyword];
    if (Array.isArray(variants)) {
      for (let i = 0; i < variants.length; i++) {
        issues.push(
          ...collectMissingRequiredProperties(
            variants[i],
            `${path}.${keyword}[${i}]`,
          ),
        );
      }
    }
  }

  for (const keyword of [`not`, `if`, `then`, `else`] as const) {
    const subSchema = node[keyword];
    if (subSchema != null) {
      issues.push(
        ...collectMissingRequiredProperties(subSchema, `${path}.${keyword}`),
      );
    }
  }

  for (const keyword of [`$defs`, `definitions`] as const) {
    const defs = node[keyword];
    if (defs != null && typeof defs === `object`) {
      for (const [key, value] of Object.entries(
        defs as Record<string, unknown>,
      )) {
        issues.push(
          ...collectMissingRequiredProperties(
            value,
            `${path}.${keyword}.${key}`,
          ),
        );
      }
    }
  }

  return issues;
}

describe(
  `buildMeaningHintCausualBridgePrompt` satisfies HasNameOf<
    typeof buildMeaningHintCausualBridgePrompt
  >,
  () => {
    test(`minimal input (no component context)`, () => {
      const result = buildMeaningHintCausualBridgePrompt({
        hanzi: `好`,
        meaning: {
          hanziWord: `好`,
          glosses: [`good`],
        },
        count: 3,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "You are a helpful assistant that creates short mnemonic explanations.

        You will be given:
        - A target: the concept the learner wants to remember.
        - A list of cues: ideas the learner already knows.

        Your task is to write a short explanation that uses every cue to make the target easy to remember.

        Guidelines:
        - Keep the explanation concise. One short sentence is preferred; use two only if necessary.
        - Use plain, natural, everyday English.
        - Prefer the simplest explanation that works.
        - Make the target the natural consequence of the events in the explanation.
        - Prefer a single, direct cause-and-effect relationship.
        - Unless the cues explicitly specify another actor, use the learner (“I”) as the subject of any action.
        - Avoid introducing intermediate concepts. Connect the cues to the target as directly as possible.
        - Every cue should play an essential role in producing the target.
        - Avoid unnecessary characters, objects, settings, or descriptive details.
        - Avoid dramatic, magical, poetic, exaggerated, or theatrical language.
        - Avoid introducing concepts that are not provided unless they are required for natural English.
        - Avoid merely listing the concepts together. They should interact meaningfully.
        - The explanation should feel obvious in hindsight, as though the cue naturally follows from the concepts.

        The learner should be able to reconstruct the target simply by remembering how the cues interacted.

        Generate multiple distinct ideas that use different relationships or perspectives rather than minor wording variations.",
              "role": "system",
            },
            {
              "content": "Generate 3 mnemonic stories:

        <data>
        {
          "target": "good",
          "cues": []
        }
        </data>",
              "role": "user",
            },
          ],
          "model": "gpt-5.4",
          "reasoningEffort": "none",
        }
      `);
    });

    test(`full input (with component context)`, () => {
      const result = buildMeaningHintCausualBridgePrompt({
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
          "messages": [
            {
              "content": "You are a helpful assistant that creates short mnemonic explanations.

        You will be given:
        - A target: the concept the learner wants to remember.
        - A list of cues: ideas the learner already knows.

        Your task is to write a short explanation that uses every cue to make the target easy to remember.

        Guidelines:
        - Keep the explanation concise. One short sentence is preferred; use two only if necessary.
        - Use plain, natural, everyday English.
        - Prefer the simplest explanation that works.
        - Make the target the natural consequence of the events in the explanation.
        - Prefer a single, direct cause-and-effect relationship.
        - Unless the cues explicitly specify another actor, use the learner (“I”) as the subject of any action.
        - Avoid introducing intermediate concepts. Connect the cues to the target as directly as possible.
        - Every cue should play an essential role in producing the target.
        - Avoid unnecessary characters, objects, settings, or descriptive details.
        - Avoid dramatic, magical, poetic, exaggerated, or theatrical language.
        - Avoid introducing concepts that are not provided unless they are required for natural English.
        - Avoid merely listing the concepts together. They should interact meaningfully.
        - The explanation should feel obvious in hindsight, as though the cue naturally follows from the concepts.

        The learner should be able to reconstruct the target simply by remembering how the cues interacted.

        Generate multiple distinct ideas that use different relationships or perspectives rather than minor wording variations.",
              "role": "system",
            },
            {
              "content": "Generate 4 mnemonic stories:

        <data>
        {
          "target": "good",
          "cues": [
            "woman",
            "child"
          ]
        }
        </data>",
              "role": "user",
            },
          ],
          "model": "gpt-5.4",
          "reasoningEffort": "none",
        }
      `);
    });
  },
);

describe(
  `buildPronunciationHintFantasyPrompt` satisfies HasNameOf<
    typeof buildPronunciationHintFantasyPrompt
  >,
  () => {
    test(`minimal input (no optional fields)`, () => {
      const result = buildPronunciationHintFantasyPrompt({
        leadCharacter: { name: `Ethan` },
        location: { name: `Gong Cha bathroom` },
        cue: { word: `use` },
        count: 3,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
        Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
        The UI shows a shared story setup separately (for example: "In [location], [character] is...").
        Return only ending-style continuations that naturally finish that setup.
        Do not repeat the setup phrase, and do not restate the character or location names in every ending unless essential for clarity.
        Do not prefix endings with ellipsis or sentence-starter punctuation.
        Write each ending as a sentence continuation fragment that can follow the setup directly.
        Write endings as participle-led continuations (for example: "watering...", "tossing...", "building...").
        Do not include a subject or auxiliary at the start (avoid "it is...", "the character is...", or starting with just "is...").
        Start with lowercase when grammatically possible (unless a proper noun must be capitalized).
        Keep each ending to 1 short sentence (2 at most when necessary).
        Start endings with a vivid action or concrete object phrase, not pronouns like "it", "he", "she", or "they".
        Vary the opening words across suggestions; avoid repeating the same starter pattern.
        Use the keyword as light inspiration for the central action, object, or conflict, but do not turn the result into a definition.
        If cue meaning context is provided, follow that exact sense instead of other possible senses.
        If extra character or location details are provided, use them to make endings more specific.
        Prefer visual, unusual, and memorable situations over generic ones.
        Lean into imaginative, playful, and cinematic moments.
        Surprising details are welcome when they remain easy to picture.
        Never include pinyin, Hanzi, IPA, tone marks, or pronunciation syllables in the ending text.
        Do not mention sound, pronunciation, phonetics, letters, initials, finals, tones, or transliteration.
        Only anchor the story on the lead character, the location, and the cue concept.
        Good endings are concrete, replayable, and mentally vivid.
        Bad endings are generic, flat, or mostly definitions.
        When the cue word (or a close form of it) appears in the ending text, wrap it in ==word== markup (e.g. ==can== or ==canning==).",
              "role": "system",
            },
            {
              "content": "Generate 3 distinct mnemonic story ideas.

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
              "role": "user",
            },
          ],
          "model": "gpt-5-mini",
          "reasoningEffort": "medium",
        }
      `);
    });

    test(`full input (all optional fields set)`, () => {
      const result = buildPronunciationHintFantasyPrompt({
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

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
        Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
        The UI shows a shared story setup separately (for example: "In [location], [character] is...").
        Return only ending-style continuations that naturally finish that setup.
        Do not repeat the setup phrase, and do not restate the character or location names in every ending unless essential for clarity.
        Do not prefix endings with ellipsis or sentence-starter punctuation.
        Write each ending as a sentence continuation fragment that can follow the setup directly.
        Write endings as participle-led continuations (for example: "watering...", "tossing...", "building...").
        Do not include a subject or auxiliary at the start (avoid "it is...", "the character is...", or starting with just "is...").
        Start with lowercase when grammatically possible (unless a proper noun must be capitalized).
        Keep each ending to 1 short sentence (2 at most when necessary).
        Start endings with a vivid action or concrete object phrase, not pronouns like "it", "he", "she", or "they".
        Vary the opening words across suggestions; avoid repeating the same starter pattern.
        Use the keyword as light inspiration for the central action, object, or conflict, but do not turn the result into a definition.
        If cue meaning context is provided, follow that exact sense instead of other possible senses.
        If extra character or location details are provided, use them to make endings more specific.
        Prefer visual, unusual, and memorable situations over generic ones.
        Lean into imaginative, playful, and cinematic moments.
        Surprising details are welcome when they remain easy to picture.
        Never include pinyin, Hanzi, IPA, tone marks, or pronunciation syllables in the ending text.
        Do not mention sound, pronunciation, phonetics, letters, initials, finals, tones, or transliteration.
        Only anchor the story on the lead character, the location, and the cue concept.
        Good endings are concrete, replayable, and mentally vivid.
        Bad endings are generic, flat, or mostly definitions.
        When the cue word (or a close form of it) appears in the ending text, wrap it in ==word== markup (e.g. ==can== or ==canning==).",
              "role": "system",
            },
            {
              "content": "Generate 4 distinct mnemonic story ideas.

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
          }
        }
        </data>",
              "role": "user",
            },
          ],
          "model": "gpt-5-mini",
          "reasoningEffort": "medium",
        }
      `);
    });

    test(`lead character data`, () => {
      const result = buildPronunciationHintFantasyPrompt({
        leadCharacter: { name: `seal` },
        location: { name: `River Stage bathroom` },
        cue: { word: `color` },
        count: 2,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
        Invent vivid, memorable mini-scenes using a character, a location, and a keyword.
        The UI shows a shared story setup separately (for example: "In [location], [character] is...").
        Return only ending-style continuations that naturally finish that setup.
        Do not repeat the setup phrase, and do not restate the character or location names in every ending unless essential for clarity.
        Do not prefix endings with ellipsis or sentence-starter punctuation.
        Write each ending as a sentence continuation fragment that can follow the setup directly.
        Write endings as participle-led continuations (for example: "watering...", "tossing...", "building...").
        Do not include a subject or auxiliary at the start (avoid "it is...", "the character is...", or starting with just "is...").
        Start with lowercase when grammatically possible (unless a proper noun must be capitalized).
        Keep each ending to 1 short sentence (2 at most when necessary).
        Start endings with a vivid action or concrete object phrase, not pronouns like "it", "he", "she", or "they".
        Vary the opening words across suggestions; avoid repeating the same starter pattern.
        Use the keyword as light inspiration for the central action, object, or conflict, but do not turn the result into a definition.
        If cue meaning context is provided, follow that exact sense instead of other possible senses.
        If extra character or location details are provided, use them to make endings more specific.
        Prefer visual, unusual, and memorable situations over generic ones.
        Lean into imaginative, playful, and cinematic moments.
        Surprising details are welcome when they remain easy to picture.
        Never include pinyin, Hanzi, IPA, tone marks, or pronunciation syllables in the ending text.
        Do not mention sound, pronunciation, phonetics, letters, initials, finals, tones, or transliteration.
        Only anchor the story on the lead character, the location, and the cue concept.
        Good endings are concrete, replayable, and mentally vivid.
        Bad endings are generic, flat, or mostly definitions.
        When the cue word (or a close form of it) appears in the ending text, wrap it in ==word== markup (e.g. ==can== or ==canning==).",
              "role": "system",
            },
            {
              "content": "Generate 2 distinct mnemonic story ideas.

        <data>
        {
          "leadCharacter": {
            "name": "seal"
          },
          "location": {
            "name": "River Stage bathroom"
          },
          "cue": {
            "word": "color"
          }
        }
        </data>",
              "role": "user",
            },
          ],
          "model": "gpt-5-mini",
          "reasoningEffort": "medium",
        }
      `);
    });
  },
);

describe(
  `buildPronunciationHintRealisticPrompt` satisfies HasNameOf<
    typeof buildPronunciationHintRealisticPrompt
  >,
  () => {
    test(`enforces realistic style constraints`, () => {
      const result = buildPronunciationHintRealisticPrompt({
        leadCharacter: { name: `Ethan` },
        location: { name: `Gong Cha bathroom` },
        cue: { word: `use` },
        count: 3,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
        Invent clear, grounded mini-scenes using a character, a location, and a keyword.
        The UI shows a shared story setup separately (for example: "In [location], [character] is...").
        Return only ending-style continuations that naturally finish that setup.
        Do not repeat the setup phrase, and do not restate the character or location names in every ending unless essential for clarity.
        Do not prefix endings with ellipsis or sentence-starter punctuation.
        Write each ending as a sentence continuation fragment that can follow the setup directly.
        Write endings as participle-led continuations (for example: "watering...", "tossing...", "building...").
        Do not include a subject or auxiliary at the start (avoid "it is...", "the character is...", or starting with just "is...").
        Start with lowercase when grammatically possible (unless a proper noun must be capitalized).
        Keep each ending to 1 short sentence (2 at most when necessary).
        Start endings with a vivid action or concrete object phrase, not pronouns like "it", "he", "she", or "they".
        Vary the opening words across suggestions; avoid repeating the same starter pattern.
        Use the keyword as light inspiration for the central action, object, or conflict, but do not turn the result into a definition.
        If cue meaning context is provided, follow that exact sense instead of other possible senses.
        If extra character or location details are provided, use them to make endings more specific.
        Keep scenes realistic and plausible in everyday life.
        Avoid supernatural, magical, dreamlike, or impossible events.
        Avoid bizarre shock-value imagery; prefer practical, familiar actions.
        Never include pinyin, Hanzi, IPA, tone marks, or pronunciation syllables in the ending text.
        Do not mention sound, pronunciation, phonetics, letters, initials, finals, tones, or transliteration.
        Only anchor the story on the lead character, the location, and the cue concept.
        Good endings are concrete, replayable, mentally vivid, and believable.
        Bad endings are generic, flat, fantastical, or mostly definitions.
        When the cue word (or a close form of it) appears in the ending text, wrap it in ==word== markup (e.g. ==can== or ==canning==).",
              "role": "system",
            },
            {
              "content": "Generate 3 distinct mnemonic story ideas.

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
              "role": "user",
            },
          ],
          "model": "gpt-5-mini",
          "reasoningEffort": "medium",
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
          "messages": [
            {
              "content": "You're a helpful assistant that creates short meaning-recognition mnemonic hints for Mandarin learners.
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
              "role": "system",
            },
            {
              "content": "Generate 3 distinct mnemonic hints.
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
              "role": "user",
            },
          ],
          "model": "gpt-5.4",
          "reasoningEffort": "none",
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
          "messages": [
            {
              "content": "You're a helpful assistant that creates short meaning-recognition mnemonic hints for Mandarin learners.
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
              "role": "system",
            },
            {
              "content": "Generate 4 distinct mnemonic hints.
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
              "role": "user",
            },
          ],
          "model": "gpt-5.4",
          "reasoningEffort": "none",
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
          "messages": [
            {
              "content": "You're a helpful assistant that generates memorable mnemonic phrases for Chinese characters. Your job is to help the learner remember what a Hanzi means using just its visual components.

        Rules:
        - Keep mnemonics realistic, intuitive, concrete and memorable.
        - Keep mnemonics short, 1-2 sentences is optimal.
        - Leverage the logical connection between the components to explain the target character.
        - The disambiguation values are form/meaning guidance only, do not include them directly in the hint.
        - Anchor on the exact gloss values, don't use them as a base stem for derivative words.
        - Only focus on meaning recall, not pronunciation.
        - Avoid introducing unnecessary elements that could distract from the core elements.
        - Put the hanzi after each gloss in parenthesis: <gloss> (<hanzi>)",
              "role": "system",
            },
            {
              "content": "Generate 3 distinct mnemonic hints:

        <data>
        {
          "targetCharacter": {
            "hanzi": "好",
            "gloss": "good"
          },
          "components": []
        }
        </data>",
              "role": "user",
            },
          ],
          "model": "gpt-5.4",
          "reasoningEffort": "none",
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
          "messages": [
            {
              "content": "You're a helpful assistant that generates memorable mnemonic phrases for Chinese characters. Your job is to help the learner remember what a Hanzi means using just its visual components.

        Rules:
        - Keep mnemonics realistic, intuitive, concrete and memorable.
        - Keep mnemonics short, 1-2 sentences is optimal.
        - Leverage the logical connection between the components to explain the target character.
        - The disambiguation values are form/meaning guidance only, do not include them directly in the hint.
        - Anchor on the exact gloss values, don't use them as a base stem for derivative words.
        - Only focus on meaning recall, not pronunciation.
        - Avoid introducing unnecessary elements that could distract from the core elements.
        - Put the hanzi after each gloss in parenthesis: <gloss> (<hanzi>)",
              "role": "system",
            },
            {
              "content": "Generate 4 distinct mnemonic hints:

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
              "role": "user",
            },
          ],
          "model": "gpt-5.4",
          "reasoningEffort": "none",
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
  `buildLocationSetDescriptionPrompt` satisfies HasNameOf<
    typeof buildLocationSetDescriptionPrompt
  >,
  () => {
    test(`minimal input (no optional notes)`, () => {
      const result = buildLocationSetDescriptionPrompt({
        label: `Outside Lawson`,
        location: `Lawson`,
        locationSet: `Outside`,
        count: 4,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a location set within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
        Each suggestion must clearly reflect both the Location and the Location Set.
        If a Viewpoint is provided, ensure the description matches that perspective.
        Describe stable, always-true aspects of the place.
        Return only the descriptive fragment itself, don't prefix with the place label.
        Avoid time of day, weather, or temporary events.
        Avoid actions or specific story moments.
        Be easy to visualize and reuse in different mnemonic scenes.
        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
              "role": "system",
            },
            {
              "content": "Generate 4 distinct reusable location descriptions for this exact combined place.

        <data>
        {
          "label": "Outside Lawson",
          "location": "Lawson",
          "locationSet": "Outside"
        }
        </data>",
              "role": "user",
            },
          ],
          "model": "gpt-5-mini",
          "reasoningEffort": "medium",
        }
      `);
    });

    test(`full input (all optional notes and viewpoint set)`, () => {
      const result = buildLocationSetDescriptionPrompt({
        label: `Outside Lawson`,
        location: `Lawson`,
        locationNotes: `The famous Japanese convenience chain store.`,
        locationSet: `Outside`,
        viewpoint: `At eye level looking at the storefront`,
        count: 4,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a location set within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
        Each suggestion must clearly reflect both the Location and the Location Set.
        If a Viewpoint is provided, ensure the description matches that perspective.
        Describe stable, always-true aspects of the place.
        Return only the descriptive fragment itself, don't prefix with the place label.
        Avoid time of day, weather, or temporary events.
        Avoid actions or specific story moments.
        Be easy to visualize and reuse in different mnemonic scenes.
        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
              "role": "system",
            },
            {
              "content": "Generate 4 distinct reusable location descriptions for this exact combined place.

        <data>
        {
          "label": "Outside Lawson",
          "location": "Lawson",
          "locationSet": "Outside",
          "locationNotes": "The famous Japanese convenience chain store.",
          "viewpoint": "At eye level looking at the storefront"
        }
        </data>",
              "role": "user",
            },
          ],
          "model": "gpt-5-mini",
          "reasoningEffort": "medium",
        }
      `);
    });

    test(`different count`, () => {
      const result = buildLocationSetDescriptionPrompt({
        label: `Gong Cha bathroom`,
        location: `Gong Cha`,
        locationSet: `bathroom`,
        count: 3,
      });

      expect(omit(result, [`schema`])).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
        Your goal is to define a stable mental image of a place that can be reused across many stories.
        You will be given a primary location and a location set within or around it. Combine them into one clear, vivid, always-true mental setting.
        Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
        Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
        Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
        Each suggestion must clearly reflect both the Location and the Location Set.
        If a Viewpoint is provided, ensure the description matches that perspective.
        Describe stable, always-true aspects of the place.
        Return only the descriptive fragment itself, don't prefix with the place label.
        Avoid time of day, weather, or temporary events.
        Avoid actions or specific story moments.
        Be easy to visualize and reuse in different mnemonic scenes.
        Good suggestions feel like a reusable mental stage.
        Bad suggestions feel like a one-time scene.",
              "role": "system",
            },
            {
              "content": "Generate 3 distinct reusable location descriptions for this exact combined place.

        <data>
        {
          "label": "Gong Cha bathroom",
          "location": "Gong Cha",
          "locationSet": "bathroom"
        }
        </data>",
              "role": "user",
            },
          ],
          "model": "gpt-5-mini",
          "reasoningEffort": "medium",
        }
      `);
    });
  },
);

describe(
  `buildMnemonicActorProfilePrompt` satisfies HasNameOf<
    typeof buildMnemonicActorProfilePrompt
  >,
  () => {
    test(`uses mnemonic actor system prompt and input wrapper`, () => {
      const result = buildMnemonicActorProfilePrompt({
        identity: `Dracula`,
      });

      expect(result.model).toBe(`gpt-5-mini`);
      expect(result.reasoningEffort).toBe(`medium`);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]?.role).toBe(`system`);
      expect(typeof result.messages[0]?.content).toBe(`string`);
      expect(result.messages[1]?.role).toBe(`user`);
      expect(typeof result.messages[1]?.content).toBe(`string`);

      expect(result.messages[0]?.content).toContain(
        `You are designing a recurring mnemonic actor for a Chinese language learning system.`,
      );
      expect(result.messages[1]?.content).toContain(
        `Generate a mnemonic actor for:`,
      );

      expect(result.messages[1]?.content).toContain(`"identity": "Dracula"`);
    });
  },
);

describe(`AI prompt schemas`, () => {
  test(`are valid for OpenAI json_schema strict object requirements`, () => {
    const schemas = [
      [
        `buildMeaningHintCausualBridgePrompt.schema`,
        buildMeaningHintCausualBridgePrompt.schema,
      ] as const,
      [
        `buildPronunciationHintFantasyPrompt.schema`,
        buildPronunciationHintFantasyPrompt.schema,
      ] as const,
      [
        `buildPronunciationHintRealisticPrompt.schema`,
        buildPronunciationHintRealisticPrompt.schema,
      ] as const,
      [`buildMeaningHintPrompt.schema`, buildMeaningHintPrompt.schema] as const,
      [
        `buildMeaningHintLogicalPrompt.schema`,
        buildMeaningHintLogicalPrompt.schema,
      ] as const,
      [
        `buildLocationSetDescriptionPrompt.schema`,
        buildLocationSetDescriptionPrompt.schema,
      ] as const,
      [
        `buildMnemonicActorProfilePrompt.schema`,
        buildMnemonicActorProfilePrompt.schema,
      ] as const,
    ];

    const allIssues: string[] = [];
    for (const [name, schema] of schemas) {
      const jsonSchema = z.toJSONSchema(schema, { unrepresentable: `throw` });
      const issues = collectMissingRequiredProperties(jsonSchema);
      for (const issue of issues) {
        allIssues.push(`${name}: ${issue}`);
      }
    }

    expect(allIssues).toEqual([]);
  });
});
