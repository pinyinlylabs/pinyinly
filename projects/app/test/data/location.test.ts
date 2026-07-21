// pyly-not-src-test
import {
  requestOpenAiResponseJson,
  zodResponseFormatJson,
} from "#server/lib/ai.js";
import type { LocationEvaluationType, LocationSpecification } from "./location";
import {
  buildLocationSpecificationPrompt,
  generateLocationSpecification,
  locationSpecificationSchema,
  runLocationSpecificationRefinementPipeline,
} from "./location";
import { beforeEach, describe, expect, test, vi } from "vitest";

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

function makeLocationSpecification(location: string): LocationSpecification {
  return {
    location,
    recognitionHooks: [`mast`, `bow`, `anchor`],
    designRules: [`Keep the hull dominant in the composition.`],
    sets: {
      arrival: {
        name: `dock`,
        designRules: [`Show the gangplank and mooring ropes.`],
        canonicalFraming: `View from the dock looking toward the deck entrance.`,
        avoidFraming: [`Do not frame it as a distant open-sea panorama.`],
      },
      heart: {
        name: `captain's cabin`,
        designRules: [`Show the richest interior detail.`],
        canonicalFraming: `View from the doorway looking toward the captain's chair and desk.`,
        avoidFraming: [`Do not reduce it to a plain hallway.`],
      },
      below: {
        name: `cargo hold`,
        designRules: [`Show stacked crates and a low ceiling.`],
        canonicalFraming: `View from knee height looking into the lower hold.`,
        avoidFraming: [`Do not frame it like the main deck.`],
      },
      ascent: {
        name: `stairs`,
        designRules: [`Show the climb upward along the mast.`],
        canonicalFraming: `View from below looking up the rigging and steps.`,
        avoidFraming: [`Do not frame it as a flat side path.`],
      },
      summit: {
        name: `crow's nest`,
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

describe(`locationSpecificationSchema`, () => {
  test(`accepts exactly five keyed sets`, () => {
    const spec = makeLocationSpecification(`Pirate ship`);

    expect(locationSpecificationSchema.parse(spec)).toEqual(spec);
  });

  test(`rejects unexpected fields inside sets`, () => {
    const spec = {
      ...makeLocationSpecification(`Pirate ship`),
      sets: {
        ...makeLocationSpecification(`Pirate ship`).sets,
        arrival: {
          ...makeLocationSpecification(`Pirate ship`).sets.arrival,
          role: `arrival`,
        },
      },
    };

    expect(() => locationSpecificationSchema.parse(spec)).toThrow(
      /unrecognized_key|unrecognized_keys/u,
    );
  });

  test(`json schema snapshot`, () => {
    expect(zodResponseFormatJson(locationSpecificationSchema))
      .toMatchInlineSnapshot(`
      {
        "name": "result_shape",
        "schema": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "additionalProperties": false,
          "properties": {
            "designRules": {
              "items": {
                "minLength": 1,
                "type": "string",
              },
              "type": "array",
            },
            "location": {
              "minLength": 1,
              "type": "string",
            },
            "recognitionHooks": {
              "items": {
                "minLength": 1,
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
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "minLength": 1,
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "minLength": 1,
                      "type": "string",
                    },
                  },
                  "required": [
                    "name",
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
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "minLength": 1,
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "minLength": 1,
                      "type": "string",
                    },
                  },
                  "required": [
                    "name",
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
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "minLength": 1,
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "minLength": 1,
                      "type": "string",
                    },
                  },
                  "required": [
                    "name",
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
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "minLength": 1,
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "minLength": 1,
                      "type": "string",
                    },
                  },
                  "required": [
                    "name",
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
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "canonicalFraming": {
                      "minLength": 1,
                      "type": "string",
                    },
                    "designRules": {
                      "items": {
                        "minLength": 1,
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "name": {
                      "minLength": 1,
                      "type": "string",
                    },
                  },
                  "required": [
                    "name",
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

describe(`buildLocationSpecificationPrompt`, () => {
  test(`keeps the input dynamic and avoids hard-coded location examples`, () => {
    const prompt = buildLocationSpecificationPrompt({
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
    expect(system).not.toMatch(/\b(?:pinyin|tone|Chinese|mnemonic)\b/iu);

    const data = extractDataBlock(user ?? ``);
    expect(data).toEqual({ location: `Pirate ship` });
  });
});

describe(`runLocationSpecificationRefinementPipeline`, () => {
  const requestMock = vi.mocked(requestOpenAiResponseJson);

  beforeEach(() => {
    requestMock.mockReset();
  });

  test(`returns immediately when evaluation passes`, async () => {
    const generated = makeLocationSpecification(`Pirate ship`);

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

    const result = await generateLocationSpecification({
      location: `Pirate ship`,
    });

    expect(result.succeeded).toBe(true);
    expect(result.stopReason).toBe(`no_major_criticisms`);
    expect(result.attempts).toHaveLength(1);
    expect(result.finalLocationSpecification).toEqual(generated);
    expect(result.finalEvaluation.passed).toBe(true);
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  test(`invokes the refiner when evaluation fails`, async () => {
    const generated = makeLocationSpecification(`Pirate ship`);
    const refined = makeLocationSpecification(`Pirate ship`);
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

    const result = await runLocationSpecificationRefinementPipeline({
      location: `Pirate ship`,
    });

    expect(result.succeeded).toBe(true);
    expect(result.attempts).toHaveLength(2);
    expect(result.finalLocationSpecification).toEqual(refined);
    expect(result.finalEvaluation.passed).toBe(true);
    expect(requestMock).toHaveBeenCalledTimes(4);
  });

  test(`regenerates from scratch on a fundamental location-wide failure`, async () => {
    const first = makeLocationSpecification(`Pirate ship`);
    const second = makeLocationSpecification(`Pirate ship`);
    second.recognitionHooks[0] = `broad sail`;

    let callCount = 0;

    requestMock.mockImplementation(async (prompt) => {
      callCount += 1;
      const kind = promptKind(prompt.messages[0]?.content ?? ``);
      if (kind === `refiner`) {
        throw new Error(
          `The refiner should not be called for fundamental failures.`,
        );
      }

      switch (kind) {
        case `generator`:
          if (callCount > 1) {
            return { data: second, model: `gpt-5.4` };
          }

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
      }
    });

    const result = await runLocationSpecificationRefinementPipeline(
      {
        location: `Pirate ship`,
      },
      { maxAttempts: 2 },
    );

    expect(result.succeeded).toBe(true);
    expect(result.attempts).toHaveLength(2);
    expect(result.finalLocationSpecification).toEqual(second);
    expect(requestMock).toHaveBeenCalledTimes(4);
  });

  test(`returns the highest-scoring candidate when none pass`, async () => {
    const first = makeLocationSpecification(`Pirate ship`);
    const second = makeLocationSpecification(`Pirate ship`);
    second.sets.heart = {
      ...second.sets.heart,
      name: `treasure room`,
    };
    const third = makeLocationSpecification(`Pirate ship`);
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

    const result = await runLocationSpecificationRefinementPipeline(
      { location: `Pirate ship` },
      { maxAttempts: 3 },
    );

    expect(result.succeeded).toBe(false);
    expect(result.attempts).toHaveLength(3);
    expect(result.finalLocationSpecification).toEqual(second);
    expect(result.finalEvaluation.score).toBe(0.7);
    expect(requestMock).toHaveBeenCalledTimes(6);
  });
});
