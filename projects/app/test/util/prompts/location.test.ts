import { generateLocationSpec } from "#server/lib/inngest/location.ts";
import {
  requestOpenAiResponseJson,
  zodResponseFormatJson,
} from "#server/lib/ai.js";
import {
  buildPopulateLocationSetDescriptionPrompt,
  buildLocationSpecPrompt,
  locationSpecWithDetailSchema,
  populateLocationSetDescriptionInputSchema,
} from "#util/prompts/location.ts";
import type {
  LocationEvaluationType,
  LocationSpecWithDetail,
} from "#util/prompts/location.ts";
import { InngestTestEngine } from "@inngest/test";
import { logger as inngestLogger } from "#server/lib/inngest/client.ts";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock(`#server/lib/ai.js`, async () => {
  const actual =
    await vi.importActual<typeof import("#server/lib/ai.js")>(
      `#server/lib/ai.js`,
    );

  return {
    ...actual,
    requestOpenAiResponseJson: vi.fn(),
  };
});

function makeLocationSpec(location: string): LocationSpecWithDetail {
  return {
    location,
    recognitionHooks: [`mast`, `bow`, `anchor`],
    designRules: [`Keep the hull dominant in the composition.`],
    sets: {
      arrival: {
        name: `dock`,
        props: [],
        designRules: [`Show the gangplank and mooring ropes.`],
        canonicalFraming: `View from the dock looking toward the deck entrance.`,
        avoidFraming: [`Do not frame it as a distant open-sea panorama.`],
      },
      heart: {
        name: `captain's cabin`,
        props: [`Desk with a map on it`],
        designRules: [`Show the richest interior detail.`],
        canonicalFraming: `View from the doorway looking toward the captain's chair and desk.`,
        avoidFraming: [`Do not reduce it to a plain hallway.`],
      },
      below: {
        name: `cargo hold`,
        props: [`Barrels`],
        designRules: [`Show stacked crates and a low ceiling.`],
        canonicalFraming: `View from knee height looking into the lower hold.`,
        avoidFraming: [`Do not frame it like the main deck.`],
      },
      ascent: {
        name: `stairs`,
        props: [`Handrail`],
        designRules: [`Show the climb upward along the mast.`],
        canonicalFraming: `View from below looking up the rigging and steps.`,
        avoidFraming: [`Do not frame it as a flat side path.`],
      },
      summit: {
        name: `crow's nest`,
        props: [`Binoculars`],
        designRules: [`Show the tiny lookout at the top of the mast.`],
        canonicalFraming: `View from the deck looking up to the lookout platform.`,
        avoidFraming: [`Do not frame it as the same as the cabin interior.`],
      },
    },
  };
}

function makeEvaluation(
  passed: boolean,
  score: number,
  criticisms: LocationEvaluationType[`criticisms`],
): LocationEvaluationType {
  return {
    passed,
    score,
    criticisms,
  };
}

function extractDataBlock(content: string): unknown {
  const match = content.match(/<data>\n([\s\S]*)\n<\/data>/u);
  expect(match?.[1]).toBeDefined();
  return JSON.parse(match?.[1] ?? `null`) as unknown;
}

function promptKind(content: string): `generator` | `evaluator` | `refiner` {
  if (content.includes(`creating the canonical design specification`)) {
    return `generator`;
  }
  if (content.includes(`evaluating a location specification`)) {
    return `evaluator`;
  }
  if (content.includes(`You revise location specifications`)) {
    return `refiner`;
  }

  throw new Error(`Unexpected prompt kind`);
}

describe(`locationSpecSchema`, () => {
  test(`accepts exactly five keyed sets`, () => {
    const spec = makeLocationSpec(`Pirate ship`);

    expect(locationSpecWithDetailSchema.parse(spec)).toEqual(spec);
  });

  test(`rejects unexpected fields inside sets`, () => {
    const spec = {
      ...makeLocationSpec(`Pirate ship`),
      sets: {
        ...makeLocationSpec(`Pirate ship`).sets,
        arrival: {
          ...makeLocationSpec(`Pirate ship`).sets.arrival,
          role: `arrival`,
        },
      },
    };

    expect(() => locationSpecWithDetailSchema.parse(spec)).toThrow(
      /unrecognized_key|unrecognized_keys/u,
    );
  });

  test(`json schema snapshot`, () => {
    expect(zodResponseFormatJson(locationSpecWithDetailSchema))
      .toMatchInlineSnapshot(`
      {
        "name": "result_shape",
        "schema": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "additionalProperties": false,
          "properties": {
            "designRules": {
              "items": {
                "type": "string",
              },
              "type": "array",
            },
            "location": {
              "type": "string",
            },
            "recognitionHooks": {
              "items": {
                "type": "string",
              },
              "type": "array",
            },
            "sets": {
              "additionalProperties": false,
              "properties": {
                "arrival": {
                  "additionalProperties": false,
                  "properties": {
                    "avoidFraming": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "type": "string",
                    },
                    "props": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                  },
                  "required": [
                    "name",
                    "props",
                    "designRules",
                    "canonicalFraming",
                    "avoidFraming",
                  ],
                  "type": "object",
                },
                "ascent": {
                  "additionalProperties": false,
                  "properties": {
                    "avoidFraming": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "type": "string",
                    },
                    "props": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                  },
                  "required": [
                    "name",
                    "props",
                    "designRules",
                    "canonicalFraming",
                    "avoidFraming",
                  ],
                  "type": "object",
                },
                "below": {
                  "additionalProperties": false,
                  "properties": {
                    "avoidFraming": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "type": "string",
                    },
                    "props": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                  },
                  "required": [
                    "name",
                    "props",
                    "designRules",
                    "canonicalFraming",
                    "avoidFraming",
                  ],
                  "type": "object",
                },
                "heart": {
                  "additionalProperties": false,
                  "properties": {
                    "avoidFraming": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "type": "string",
                    },
                    "props": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                  },
                  "required": [
                    "name",
                    "props",
                    "designRules",
                    "canonicalFraming",
                    "avoidFraming",
                  ],
                  "type": "object",
                },
                "summit": {
                  "additionalProperties": false,
                  "properties": {
                    "avoidFraming": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "type": "string",
                    },
                    "props": {
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                  },
                  "required": [
                    "name",
                    "props",
                    "designRules",
                    "canonicalFraming",
                    "avoidFraming",
                  ],
                  "type": "object",
                },
              },
              "required": [
                "arrival",
                "heart",
                "below",
                "ascent",
                "summit",
              ],
              "type": "object",
            },
          },
          "required": [
            "location",
            "recognitionHooks",
            "designRules",
            "sets",
          ],
          "type": "object",
        },
        "type": "json_schema",
      }
    `);
  });
});

describe(
  `buildPopulateLocationSetDescriptionPrompt` satisfies HasNameOf<
    typeof buildPopulateLocationSetDescriptionPrompt
  >,
  () => {
    test(`builds a single-description prompt from location spec and target set`, () => {
      const result = buildPopulateLocationSetDescriptionPrompt({
        locationSpec: makeLocationSpec(`Pirate ship`),
        setKey: `below`,
      });

      expect(result.model).toBe(`gpt-5.5`);
      expect(result.reasoningEffort).toBe(`low`);
      expect(result.messages).toHaveLength(2);

      const system = result.messages[0]?.content ?? ``;
      const user = result.messages[1]?.content ?? ``;

      expect(system).toContain(
        `You are an expert guidebook writer creating an illustrated guide to a collection of famous fictional locations.`,
      );
      expect(system).toContain(`Write 60–100 words.`);
      expect(system).toContain(
        `Do not invent lore, history, characters, stories, or new architectural features.`,
      );

      expect(user).toContain(`<input>`);
      expect(user).toContain(`"location": "Pirate ship"`);
      expect(user).toContain(`"set": "below"`);
      expect(user).toContain(`"name": "cargo hold"`);
      expect(user).not.toContain(`{{ input }}`);
    });

    test(`input schema rejects unexpected fields`, () => {
      const result = populateLocationSetDescriptionInputSchema.safeParse({
        locationSpec: makeLocationSpec(`Pirate ship`),
        setKey: `heart`,
        extra: true,
      });

      expect(result.success).toBe(false);
    });
  },
);

describe(`buildLocationSpecPrompt`, () => {
  test(`keeps the input dynamic and avoids hard-coded location examples`, () => {
    const prompt = buildLocationSpecPrompt({
      location: `Pirate ship`,
    });
    const system = prompt.messages.find(
      (message) => message.role === `system`,
    )?.content;
    const user = prompt.messages.find(
      (message) => message.role === `user`,
    )?.content;

    expect(system).toBeDefined();
    expect(user).toBeDefined();
    expect(system).not.toMatch(
      /\b(?:Pirate ship|Castle|Temple|Train station)\b/u,
    );
    expect(system).not.toMatch(/\b(?:pinyin|tone|Chinese)\b/iu);

    const data = extractDataBlock(user ?? ``);
    expect(data).toEqual({ location: `Pirate ship` });
  });
});

describe(`generateLocationSpec`, () => {
  const requestMock = vi.mocked(requestOpenAiResponseJson);

  beforeEach(() => {
    vi.spyOn(inngestLogger, `info`).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(inngestLogger.info).mockReset();
  });

  async function executeRefinement(options: {
    location: string;
    maxAttempts?: number;
  }): Promise<LocationSpecWithDetail> {
    const testEngine = new InngestTestEngine({
      function: generateLocationSpec,
    });

    const { result, error } = await testEngine.execute({
      events: [
        {
          name: `inngest/function.invoked`,
          data:
            options.maxAttempts == null
              ? { location: options.location }
              : {
                  location: options.location,
                  maxAttempts: options.maxAttempts,
                },
        },
      ],
    });

    if (error != null) {
      throw error instanceof Error
        ? error
        : new Error(`Refinement execution failed`);
    }

    return result as LocationSpecWithDetail;
  }

  beforeEach(() => {
    requestMock.mockReset();
  });

  test(`returns immediately when evaluation passes`, async () => {
    const generated = makeLocationSpec(`Pirate ship`);

    requestMock.mockImplementation(async (prompt) => {
      const kind = promptKind(prompt.messages[0]?.content ?? ``);
      if (kind === `refiner`) {
        throw new Error(`refiner should not be called when evaluation passes`);
      }

      switch (kind) {
        case `generator`:
          return { data: generated, model: `gpt-5.4` };
        case `evaluator`:
          return {
            data: makeEvaluation(true, 1, []),
            model: `gpt-5.4`,
          };
      }
    });

    const result = await executeRefinement({ location: `Pirate ship` });

    expect(result).toEqual(generated);
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  test(`invokes the refiner when evaluation fails`, async () => {
    const generated = makeLocationSpec(`Pirate ship`);
    const refined = makeLocationSpec(`Pirate ship`);
    refined.sets.heart = {
      ...refined.sets.heart,
      name: `treasure room`,
    };

    let callCount = 0;

    requestMock.mockImplementation(async (prompt) => {
      callCount += 1;
      switch (promptKind(prompt.messages[0]?.content ?? ``)) {
        case `generator`:
          return { data: generated, model: `gpt-5.4` };
        case `evaluator`:
          if (callCount === 2) {
            return {
              data: makeEvaluation(false, 0.2, [
                {
                  code: `WEAK_HEART`,
                  scope: `heart`,
                  severity: `major`,
                  message: `The heart is too close to a routine interior.`,
                  recommendation: `Choose the most memorable destination instead.`,
                },
              ]),
              model: `gpt-5.4`,
            };
          }

          return {
            data: makeEvaluation(true, 0.9, []),
            model: `gpt-5.4`,
          };
        case `refiner`:
          return { data: refined, model: `gpt-5.4` };
      }
    });

    const result = await executeRefinement({
      location: `Pirate ship`,
      maxAttempts: 1,
    });

    expect(result).toEqual(refined);
    expect(requestMock).toHaveBeenCalledTimes(4);
  });

  test(`still refines and can recover from a fundamental location-wide failure`, async () => {
    const first = makeLocationSpec(`Pirate ship`);
    const refined = makeLocationSpec(`Pirate ship`);
    refined.recognitionHooks[0] = `broad sail`;

    let callCount = 0;

    requestMock.mockImplementation(async (prompt) => {
      callCount += 1;
      const kind = promptKind(prompt.messages[0]?.content ?? ``);

      switch (kind) {
        case `generator`:
          return { data: first, model: `gpt-5.4` };
        case `evaluator`:
          if (callCount === 4) {
            return {
              data: makeEvaluation(true, 0.9, []),
              model: `gpt-5.4`,
            };
          }

          return {
            data: makeEvaluation(false, 0.1, [
              {
                code: `NON_CANONICAL`,
                scope: `location`,
                severity: `major`,
                message: `The location reads like an arbitrary invention rather than a canonical ship.`,
                recommendation: `Regenerate the location from the shared mental image.`,
              },
            ]),
            model: `gpt-5.4`,
          };
        case `refiner`:
          return { data: refined, model: `gpt-5.4` };
      }
    });

    const result = await executeRefinement({
      location: `Pirate ship`,
      maxAttempts: 1,
    });

    expect(result).toEqual(refined);
    expect(requestMock).toHaveBeenCalledTimes(4);
  });

  test(`returns the highest-scoring candidate when none pass`, async () => {
    const first = makeLocationSpec(`Pirate ship`);
    const second = makeLocationSpec(`Pirate ship`);
    second.sets.heart = {
      ...second.sets.heart,
      name: `treasure room`,
    };
    const third = makeLocationSpec(`Pirate ship`);
    third.sets.heart = {
      ...third.sets.heart,
      name: `flag deck`,
    };

    let callCount = 0;

    requestMock.mockImplementation(async (prompt) => {
      callCount += 1;
      switch (promptKind(prompt.messages[0]?.content ?? ``)) {
        case `generator`:
          return { data: first, model: `gpt-5.4` };
        case `evaluator`: {
          if (callCount === 2) {
            return {
              data: makeEvaluation(false, 0.2, [
                {
                  code: `WEAK_HEART`,
                  scope: `heart`,
                  severity: `major`,
                  message: `The heart is too ordinary.`,
                  recommendation: `Use the most memorable destination.`,
                },
              ]),
              model: `gpt-5.4`,
            };
          }

          if (callCount === 4) {
            return {
              data: makeEvaluation(false, 0.7, [
                {
                  code: `WEAK_COHERENCE`,
                  scope: `location`,
                  severity: `major`,
                  message: `The overall location is still slightly inconsistent.`,
                  recommendation: `Keep the location identity tighter.`,
                },
              ]),
              model: `gpt-5.4`,
            };
          }

          return {
            data: makeEvaluation(false, 0.6, [
              {
                code: `WEAK_DISTINCTIVENESS`,
                scope: `summit`,
                severity: `major`,
                message: `The summit is less distinctive than it could be.`,
                recommendation: `Make the summit clearer.`,
              },
            ]),
            model: `gpt-5.4`,
          };
        }
        case `refiner`:
          if (callCount === 3) {
            return { data: second, model: `gpt-5.4` };
          }

          return { data: third, model: `gpt-5.4` };
      }
    });

    const result = await executeRefinement({
      location: `Pirate ship`,
      maxAttempts: 2,
    });

    expect(result).toEqual(second);
    expect(requestMock).toHaveBeenCalledTimes(7);
  });
});
